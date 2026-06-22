import type { ModuleNames } from "@src/constants"

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
 * Normalized error shape placed under `extensions.originalError` on the
 * `GraphQLError` thrown by {@link CoreExceptionFilter}.
 *
 * @remarks
 * Read back out by `ErrorService.errorFilter` (wired as Apollo's `formatError`)
 * to build the final response sent to the client, with field stripping in production.
 * There is no `path` field here (unlike the REST equivalent) — GraphQL errors carry
 * their own `path` (the resolved field path), set by Apollo itself, not by application code.
 */
export type ErrorResponseBody = {
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
