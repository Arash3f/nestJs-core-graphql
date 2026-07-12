import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import type { GqlContextType } from "@nestjs/graphql"
import { AppException } from "@src/app.exception"
import { ModuleNames } from "@src/common/constants"
import {
  ErrorResponseBody,
  HttpExceptionResponseBody,
} from "@src/common/filters/core-exception.type"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"
import type { FastifyReply, FastifyRequest } from "fastify"
import { GraphQLError } from "graphql"

/**
 * Global exception filter that normalizes every thrown exception into a
 * consistent {@link ErrorResponseBody}.
 *
 * @remarks
 * - **GraphQL**: rethrows a `GraphQLError` whose `extensions.originalError`
 *   carries the body (Apollo always replies HTTP 200).
 * - **HTTP** (e.g. `/health`): writes the body with the matching status code,
 *   matching the REST core filter contract.
 */
@Catch()
export class CoreExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CoreExceptionFilter.name)

  constructor(private readonly env: EnvConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const errorBody = this.normalize(exception)
    const isUnhandled = !(exception instanceof AppException || exception instanceof HttpException)

    if (this.env.nodeEnv === EnvType.Production) {
      delete errorBody.debugError
      delete errorBody.developerMessage
      if (isUnhandled) {
        errorBody.message = "Internal server error"
      }
    } else {
      this.logger.error({ exception, errorBody })
    }

    if (host.getType<GqlContextType>() === "graphql") {
      throw new GraphQLError(errorBody.message, {
        extensions: { originalError: errorBody },
      })
    }

    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    response.status(errorBody.statusCode).send({
      ...errorBody,
      path: request.url,
      statusCode: errorBody.statusCode,
    })
  }

  private normalize(exception: unknown): ErrorResponseBody {
    const errorBody: ErrorResponseBody = {
      code: 9999,
      module: ModuleNames.AppModule,
      message: "Internal server error",
      persianTranslation: "خطای داخلی سرور",
      developerMessage: "",
      timestamp: new Date().toISOString(),
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    }

    if (exception instanceof AppException) {
      errorBody.message = exception.message
      errorBody.statusCode = exception.statusCode
      errorBody.persianTranslation = exception.persianTranslation
      errorBody.developerMessage = exception.developerMessage ?? ""
      errorBody.code = exception.code
      errorBody.module = exception.module
    } else if (exception instanceof HttpException) {
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
      errorBody.message = exception.message
      errorBody.debugError = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      }
    } else if (typeof exception === "string") {
      errorBody.message = exception
      errorBody.debugError = {
        name: "Error",
        message: exception,
      }
    } else {
      errorBody.debugError = {
        value: exception,
      }
    }

    return errorBody
  }
}
