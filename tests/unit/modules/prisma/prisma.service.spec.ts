import { Prisma } from "@prisma/client"
import { AppException } from "@src/app.exception"
import { EnvType } from "@src/modules/config/types/config.type"
import {
  PRISMA_DUPLICATED_FIELD,
  PRISMA_FK_CONSTRAINT,
  PRISMA_NOT_FOUND,
} from "@src/modules/prisma/constants/const"
import { PrismaErrors } from "@src/modules/prisma/constants/errors"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { UserErrors } from "@src/modules/user/constants/errors"
import { Pool } from "pg"

const buildService = (nodeEnv: EnvType = EnvType.Production): PrismaService =>
  new PrismaService({
    nodeEnv,
    databaseConfig: { connectionUrl: "postgresql://user:pass@localhost:5432/db" },
  } as never)

const buildKnownError = (
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError =>
  Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
    name: "PrismaClientKnownRequestError",
    message: "db error",
    code,
    clientVersion: "test",
    meta,
  })

describe("PrismaService", () => {
  describe("handlePrismaErrors", () => {
    const service = buildService()

    it("rethrows non-Prisma errors unchanged", () => {
      const error = new Error("boom")
      expect(() => service.handlePrismaErrors({ error })).toThrow(error)
    })

    it("throws PrismaErrors.RowNotFound for P2025 by default", () => {
      const error = buildKnownError(PRISMA_NOT_FOUND)
      expect(() => service.handlePrismaErrors({ error })).toThrow(
        expect.objectContaining(PrismaErrors.RowNotFound),
      )
    })

    it("throws the provided notFoundError for P2025", () => {
      const error = buildKnownError(PRISMA_NOT_FOUND)
      expect(() =>
        service.handlePrismaErrors({ error, notFoundError: UserErrors.UserNotFound }),
      ).toThrow(expect.objectContaining(UserErrors.UserNotFound))
    })

    it("throws PrismaErrors.FieldIsDuplicated for P2002 with no matching field", () => {
      const error = buildKnownError(PRISMA_DUPLICATED_FIELD, { target: ["email"] })
      expect(() => service.handlePrismaErrors({ error })).toThrow(
        expect.objectContaining(PrismaErrors.FieldIsDuplicated),
      )
    })

    it("matches a custom duplicatedErrors entry from the legacy `target` shape", () => {
      const error = buildKnownError(PRISMA_DUPLICATED_FIELD, { target: ["username"] })
      expect(() =>
        service.handlePrismaErrors({
          error,
          duplicatedErrors: [{ field: "username", error: UserErrors.UsernameIsDuplicated }],
        }),
      ).toThrow(expect.objectContaining(UserErrors.UsernameIsDuplicated))
    })

    it("matches a custom duplicatedErrors entry from the driver-adapter constraint shape", () => {
      const error = buildKnownError(PRISMA_DUPLICATED_FIELD, {
        driverAdapterError: {
          cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["username"] } },
        },
      })
      expect(() =>
        service.handlePrismaErrors({
          error,
          duplicatedErrors: [{ field: "username", error: UserErrors.UsernameIsDuplicated }],
        }),
      ).toThrow(expect.objectContaining(UserErrors.UsernameIsDuplicated))
    })

    it("throws PrismaErrors.ForeignKeyConstraintFailed for P2003 with no matching field", () => {
      const error = buildKnownError(PRISMA_FK_CONSTRAINT, { field_name: "categoryId" })
      expect(() => service.handlePrismaErrors({ error })).toThrow(
        expect.objectContaining(PrismaErrors.ForeignKeyConstraintFailed),
      )
    })

    it("matches a custom foreignKeyErrors entry from the legacy `field_name` shape", () => {
      const error = buildKnownError(PRISMA_FK_CONSTRAINT, { field_name: "categoryId" })
      expect(() =>
        service.handlePrismaErrors({
          error,
          foreignKeyErrors: [{ field: "categoryId", error: UserErrors.UserNotFound }],
        }),
      ).toThrow(expect.objectContaining(UserErrors.UserNotFound))
    })

    it("matches a custom foreignKeyErrors entry from the driver-adapter constraint index", () => {
      const error = buildKnownError(PRISMA_FK_CONSTRAINT, {
        driverAdapterError: {
          cause: {
            kind: "ForeignKeyConstraintViolation",
            constraint: { index: "faqs_categoryId_fkey" },
          },
        },
      })
      expect(() =>
        service.handlePrismaErrors({
          error,
          foreignKeyErrors: [{ field: "faqs_categoryId_fkey", error: UserErrors.UserNotFound }],
        }),
      ).toThrow(expect.objectContaining(UserErrors.UserNotFound))
    })

    it("rethrows unhandled Prisma error codes unchanged", () => {
      const error = buildKnownError("P2001")
      expect(() => service.handlePrismaErrors({ error })).toThrow(error)
    })

    it("throws an AppException instance", () => {
      const error = buildKnownError(PRISMA_NOT_FOUND)
      expect(() => service.handlePrismaErrors({ error })).toThrow(AppException)
    })
  })

  describe("onModuleInit", () => {
    it("connects and subscribes to query events in development", async () => {
      const service = buildService(EnvType.Development)
      const connectSpy = jest.spyOn(service, "$connect").mockResolvedValue(undefined)
      const onSpy = jest.spyOn(service, "$on" as never)

      await service.onModuleInit()

      expect(connectSpy).toHaveBeenCalled()
      expect(onSpy).toHaveBeenCalledWith("query", expect.any(Function))
    })

    it("connects without subscribing to query events outside development", async () => {
      const service = buildService(EnvType.Production)
      const connectSpy = jest.spyOn(service, "$connect").mockResolvedValue(undefined)
      const onSpy = jest.spyOn(service, "$on" as never)

      await service.onModuleInit()

      expect(connectSpy).toHaveBeenCalled()
      expect(onSpy).not.toHaveBeenCalled()
    })
  })

  describe("onModuleDestroy", () => {
    it("disconnects prisma and closes the pg pool", async () => {
      const service = buildService()
      const disconnectSpy = jest.spyOn(service, "$disconnect").mockResolvedValue(undefined)
      const poolEndSpy = jest.spyOn(Pool.prototype, "end").mockResolvedValue(undefined as never)

      await service.onModuleDestroy()

      expect(disconnectSpy).toHaveBeenCalled()
      expect(poolEndSpy).toHaveBeenCalled()
    })
  })
})
