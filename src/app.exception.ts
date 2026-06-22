import type { ModuleNames } from "src/constants"

/**
 * Plain-object description of a domain error.
 *
 * @remarks
 * Declared once per module in `constants/errors.ts` and thrown by reference via
 * {@link AppException}. Uniqueness is the `(module, code)` pair — `code` restarts
 * at `1` per module, so it is not globally unique on its own.
 *
 * @property message - English error message.
 * @property statusCode - HTTP status code returned to the client.
 * @property persianTranslation - User-facing Persian message.
 * @property developerMessage - Optional extra context for developers (stripped in production).
 * @property code - Module-local error code (unique only together with `module`).
 * @property module - Owning module; must be a {@link ModuleNames} member.
 */
export interface AppErrorDescriptor {
  message: string
  statusCode: number
  persianTranslation: string
  developerMessage?: string
  code: number
  module: ModuleNames
}

/**
 * Error wrapper around an {@link AppErrorDescriptor}.
 *
 * @remarks
 * Copies every descriptor field onto itself and fixes the prototype so
 * `instanceof AppException` works after transpilation. Normalized into a single
 * response shape by `CoreExceptionFilter`.
 *
 * @example
 * ```ts
 * throw new AppException(AuthErrors.UserIsNotAuthorized)
 *
 * // graft dynamic context by spreading the descriptor:
 * throw new AppException({ ...PrismaErrors.InvalidSortField, developerMessage: `"${field}" is not sortable` })
 * ```
 */
export class AppException extends Error {
  public readonly statusCode: number
  public readonly persianTranslation: string
  public readonly developerMessage?: string
  public readonly code: number
  public readonly module: ModuleNames

  constructor(public readonly error: AppErrorDescriptor) {
    super(error.message)
    this.statusCode = error.statusCode
    this.persianTranslation = error.persianTranslation
    this.developerMessage = error.developerMessage
    this.code = error.code
    this.module = error.module

    Object.setPrototypeOf(this, AppException.prototype)
  }
}
