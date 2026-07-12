import type { ModuleNames } from "@src/common/constants"

/**
 * HTTP exception response body from NestJS native `HttpException`.
 *
 * @remarks
 * This is the standard format NestJS produces when throwing `HttpException`
 * or using built-in HTTP exceptions (e.g. `ValidationPipe`'s `BadRequestException`).
 *
 * @internal
 */
export type HttpExceptionResponseBody = {
  /**
   * Error message(s) - can be a single string or array of strings (validation errors)
   */
  message?: string | string[]

  /**
   * Error type (e.g., 'Bad Request', 'Not Found')
   */
  error?: string

  /**
   * HTTP status code
   */
  statusCode?: number
}

/**
 * Standardized error response body format for the application.
 *
 * @remarks
 * For GraphQL, this shape is placed under `extensions.originalError` on the
 * `GraphQLError` thrown by {@link CoreExceptionFilter} (Apollo's own `path` is
 * used for the field path). For plain HTTP routes (e.g. health), the same body
 * is sent as the JSON response and includes `path`.
 */
export type ErrorResponseBody = {
  /**
   * Request path that caused the error (HTTP routes only).
   */
  path?: string

  /**
   * Custom error code (module-specific)
   */
  code: number

  /**
   * Module name where the error originated
   */
  module: ModuleNames

  /**
   * User-friendly error message in English
   */
  message: string

  /**
   * User-friendly error message in Persian (Farsi)
   */
  persianTranslation: string

  /**
   * Technical error message for developers (excluded in production)
   */
  developerMessage?: string

  /**
   * ISO timestamp of when the error occurred
   */
  timestamp: string

  /**
   * HTTP status code
   */
  statusCode: number

  /**
   * Debug information (excluded in production)
   */
  debugError?: unknown
}
