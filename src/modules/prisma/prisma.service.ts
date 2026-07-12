import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { Injectable, Logger } from "@nestjs/common"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"
import { AppErrorDescriptor, AppException } from "@src/app.exception"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"
import {
  PRISMA_DUPLICATED_FIELD,
  PRISMA_FK_CONSTRAINT,
  PRISMA_NOT_FOUND,
} from "@src/modules/prisma/constants/const"
import { PrismaErrors } from "@src/modules/prisma/constants/errors"
import {
  DriverAdapterCause,
  PrismaDuplicatedError,
  PrismaForeignKeyError,
  PrismaKnownError,
} from "@src/modules/prisma/constants/type"
import { Pool } from "pg"

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, "query">
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)
  private readonly pool: Pool
  private readonly isDev: boolean

  constructor(env: EnvConfigService) {
    const isDev = env.nodeEnv === EnvType.Development

    const log: Prisma.LogDefinition[] = isDev
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "info" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [{ emit: "stdout", level: "error" }]

    const pool = new Pool({
      connectionString: env.DATABASE_CONNECTION_URL,
    })

    const adapter = new PrismaPg(pool)

    super({
      adapter,
      log,
    })

    this.pool = pool
    this.isDev = isDev
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()

    if (this.isDev) {
      this.$on("query", (event: Prisma.QueryEvent) => {
        this.logger.verbose({
          query: event.query,
          params: event.params,
          durationMs: event.duration,
        })
      })
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
    await this.pool.end()
  }

  private isPrismaKnownError(error: unknown): error is PrismaKnownError {
    return error instanceof Prisma.PrismaClientKnownRequestError
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string")
  }

  /**
   * Extracts the constrained field name(s) from a driver-adapter constraint violation.
   *
   * The `@prisma/adapter-pg` driver reports the offending columns as either
   * `constraint.fields` (an array of column names) or, more commonly, `constraint.index`
   * (the constraint name, e.g. `"faqs_categoryId_fkey"`). This normalizes both shapes.
   *
   * @param error - The Prisma known-request error to inspect
   * @param kind - The driver-adapter cause kind to match (e.g. `"UniqueConstraintViolation"`)
   *
   * @returns The matched field/constraint names, or an empty array when the shape is unknown
   */
  private getConstraintFields(error: PrismaKnownError, kind: string): string[] {
    const cause = (error.meta as { driverAdapterError?: { cause?: DriverAdapterCause } })
      ?.driverAdapterError?.cause
    if (cause?.kind === kind) {
      if (this.isStringArray(cause.constraint?.fields)) {
        return cause.constraint.fields
      }
      // pg adapter reports the constraint name (e.g. "faqs_categoryId_fkey") as `index`
      if (typeof cause.constraint?.index === "string") {
        return [cause.constraint.index]
      }
    }
    return []
  }

  private getDuplicatedFields(error: PrismaKnownError): string[] {
    // new Prisma
    const fields = this.getConstraintFields(error, "UniqueConstraintViolation")
    if (fields.length) return fields
    // older Prisma
    const target: unknown = error.meta?.target
    if (typeof target === "string") return [target]
    if (this.isStringArray(target)) return target
    return []
  }

  private getForeignKeyFields(error: PrismaKnownError): string[] {
    // new Prisma
    const fields = this.getConstraintFields(error, "ForeignKeyConstraintViolation")
    if (fields.length) return fields
    // older Prisma
    const fieldName: unknown = error.meta?.field_name
    if (typeof fieldName === "string") return [fieldName]
    return []
  }

  /**
   * Centralized Prisma error handler that transforms database errors into domain-specific application errors.
   *
   * @description
   * This method provides a unified way to handle common Prisma errors across your application.
   * It intercepts Prisma-specific error codes and converts them into meaningful business errors
   * using your application's error handling system.
   *
   * ## Error Types Handled
   *
   * ### P2025 - Record Not Found
   * - Thrown by Prisma operations like `findUniqueOrThrow()`, `update()`, `delete()`
   * - Returns `notFoundError` if provided, otherwise `PrismaErrors.RowNotFound`
   *
   * ### P2002 - Unique Constraint Violation (Duplicate Field)
   * - Thrown when creating or updating a record with duplicate unique field values
   * - Extracts the duplicated field name and matches against `duplicatedErrors` array
   * - Returns matched custom error or `PrismaErrors.FieldIsDuplicated` as fallback
   *
   * ### P2003 - Foreign Key Constraint Violation
   * - Thrown when writing a relation/foreign key that references a missing record,
   *   or when deleting a record still referenced by others
   * - Extracts the constrained field name and matches against `foreignKeyErrors` array
   * - Returns matched custom error or `PrismaErrors.ForeignKeyConstraintFailed` as fallback
   *
   * ### Other Prisma Errors
   * - All other Prisma error codes are re-thrown as-is
   *
   * ### Non-Prisma Errors
   * - Any error not originating from Prisma is re-thrown unchanged
   *
   * @param {PrismaDuplicatedError[]} [info.duplicatedErrors] - Array of field-specific duplicate error mappings
   * @param {PrismaForeignKeyError[]} [info.foreignKeyErrors] - Array of field-specific foreign-key error mappings
   *
   * @returns {never} This method always throws an exception and never returns a value
   *
   * @example
   * Basic usage with default errors:
   * ```typescript
   * try {
   *   return await this.prisma.user.findUniqueOrThrow({
   *     where: { id: userId }
   *   })
   * } catch (error) {
   *   this.prisma.handlePrismaErrors({ error })
   * }
   * ```
   *
   * @example
   * Combine not found and duplicate handling:
   * ```typescript
   * try {
   *   return await this.prisma.category.update({
   *     where: { id: categoryId },
   *     data: { slug: "new-slug" }
   *   })
   * } catch (error) {
   *   this.prisma.handlePrismaErrors({
   *     error,
   *     notFoundError: CategoryErrors.CategoryNotFound,
   *     duplicatedErrors: [
   *       {
   *         error: CategoryErrors.SlugIsDuplicated,
   *         field: Prisma.CategoryScalarFieldEnum.slug
   *       }
   *     ]
   *   })
   * }
   * ```
   */
  handlePrismaErrors(info: {
    error: unknown
    notFoundError?: AppErrorDescriptor
    duplicatedErrors?: PrismaDuplicatedError[]
    foreignKeyErrors?: PrismaForeignKeyError[]
  }): never {
    const { error, notFoundError, duplicatedErrors, foreignKeyErrors } = info
    if (!this.isPrismaKnownError(error)) {
      throw error
    }
    if (error.code === PRISMA_NOT_FOUND) {
      throw new AppException(notFoundError ?? PrismaErrors.RowNotFound)
    }
    if (error.code === PRISMA_DUPLICATED_FIELD) {
      const duplicatedFields = this.getDuplicatedFields(error)
      const matched = duplicatedErrors?.find((item) =>
        duplicatedFields.some((field) => field.includes(item.field)),
      )
      throw new AppException(matched?.error ?? PrismaErrors.FieldIsDuplicated)
    }
    if (error.code === PRISMA_FK_CONSTRAINT) {
      const foreignKeyFields = this.getForeignKeyFields(error)
      const matched = foreignKeyErrors?.find((item) =>
        foreignKeyFields.some((field) => field.includes(item.field)),
      )
      throw new AppException(matched?.error ?? PrismaErrors.ForeignKeyConstraintFailed)
    }
    throw error
  }
}
