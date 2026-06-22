import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import { AppException } from "@src/app.exception"
import {
  ErrorResponseBody,
  HttpExceptionResponseBody,
} from "@src/common/filters/core-exception.type"
import { ModuleNames } from "@src/constants"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"
import { GraphQLError } from "graphql"

/**
 * Global exception filter that normalizes every exception thrown from a resolver
 * into a consistent `ErrorResponseBody` shape and rethrows it as a `GraphQLError`.
 *
 * @description
 * Unlike a REST exception filter, this never touches the HTTP response — Apollo
 * owns the response for GraphQL operations and always replies with HTTP 200, embedding
 * errors in the `errors` array of the GraphQL response body. Writing a custom status
 * code here (the REST pattern) would break that contract. Instead, this filter:
 *
 * 1. Normalizes the exception into an `ErrorResponseBody`.
 * 2. Throws a `GraphQLError` whose `extensions.originalError` carries that body.
 * 3. Lets Apollo's `formatError` (`ErrorService.errorFilter`, wired in `app.module.ts`)
 *    read `extensions.originalError` to build the final client-facing shape, stripping
 *    `debugError`/`developerMessage` in production.
 *
 * Without this filter, NestJS's default GraphQL exception handling only special-cases
 * `HttpException`; a plain thrown `Error` (or `AppException`, which extends `Error`)
 * would otherwise collapse into a generic "Internal server error" and lose its
 * `code`/`module`/`persianTranslation` fields.
 *
 * @decorator `@Catch()` - Catches all exceptions (no specific type)
 *
 * @example
 * Register as global filter:
 * ```ts
 * // main.ts
 * app.useGlobalFilters(new CoreExceptionFilter(configService))
 * ```
 *
 * @example
 * Throwing AppException (handled by this filter):
 * ```ts
 * throw new AppException(AuthErrors.UserIsNotAuthorized)
 * ```
 *
 * @see {@link AppException} - Business logic exceptions
 */
@Catch()
export class CoreExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CoreExceptionFilter.name)

  /**
   * Creates an instance of CoreExceptionFilter.
   *
   * @param env - Environment configuration service (used to check node environment)
   */
  constructor(private readonly env: EnvConfigService) {}

  /**
   * Main exception handling method called by NestJS when an exception occurs.
   *
   * @param exception - The caught exception (can be any type)
   * @param _host - Arguments host (unused — GraphQL errors carry no HTTP response to write to)
   * @throws {GraphQLError} Always — carries the normalized `ErrorResponseBody` under `extensions.originalError`.
   *
   * @remarks
   * **Exception Processing Priority:**
   * 1. AppException (most specific, business logic)
   * 2. HttpException (NestJS HTTP exceptions, e.g. from `ValidationPipe`)
   * 3. Error (generic JavaScript errors)
   * 4. string (raw error messages)
   * 5. unknown (fallback for any other type)
   *
   * **Environment Behavior:**
   * - Production: Removes `debugError` and `developerMessage` fields
   * - Non-Production: Logs full exception details and includes debug info
   */
  catch(exception: unknown, _host: ArgumentsHost): never {
    const errorBody = this.normalize(exception)

    if (this.env.nodeEnv === EnvType.Production) {
      delete errorBody.debugError
      delete errorBody.developerMessage
    } else {
      this.logger.error({ exception, errorBody })
    }

    throw new GraphQLError(errorBody.message, {
      extensions: { originalError: errorBody },
    })
  }

  /**
   * Normalizes an arbitrary thrown value into a consistent {@link ErrorResponseBody}.
   *
   * @param exception - The caught exception (can be any type)
   * @returns The normalized error body.
   */
  private normalize(exception: unknown): ErrorResponseBody {
    const errorBody: ErrorResponseBody = {
      code: 9999,
      module: ModuleNames.ErrorModule,
      message: "Internal server error",
      persianTranslation: "خطای داخلی سرور",
      developerMessage: "",
      timestamp: new Date().toISOString(),
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    }

    if (exception instanceof AppException) {
      /**
       * Handle AppException (business logic errors)
       * Preserves all custom fields: message, translation, code, module
       */
      errorBody.message = exception.message
      errorBody.statusCode = exception.statusCode
      errorBody.persianTranslation = exception.persianTranslation
      errorBody.developerMessage = exception.developerMessage ?? ""
      errorBody.code = exception.code
      errorBody.module = exception.module
    } else if (exception instanceof HttpException) {
      /**
       * Handle NestJS HttpException
       * Extracts status code and response body (supports string or object)
       * Converts validation error arrays to comma-separated strings
       */
      errorBody.statusCode = exception.getStatus()

      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === "string") {
        errorBody.message = exceptionResponse
        errorBody.debugError = { message: exceptionResponse }
      } else {
        const responseBody = exceptionResponse as HttpExceptionResponseBody

        if (Array.isArray(responseBody.message)) {
          errorBody.message = responseBody.message.join(", ")
        } else if (typeof responseBody.message === "string") {
          errorBody.message = responseBody.message
        } else {
          errorBody.message = exception.message
        }

        errorBody.debugError = responseBody
      }
    } else if (exception instanceof Error) {
      /**
       * Handle standard JavaScript Error
       * Captures error name, message, and stack trace
       */
      errorBody.message = exception.message
      errorBody.debugError = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      }
    } else if (typeof exception === "string") {
      /**
       * Handle string exceptions
       * Some libraries or code may throw raw strings
       */
      errorBody.message = exception
      errorBody.debugError = {
        name: "Error",
        message: exception,
      }
    } else {
      /**
       * Fallback for unknown exception types
       * Ensures the application never crashes
       */
      errorBody.debugError = {
        value: exception,
      }
    }

    return errorBody
  }
}
