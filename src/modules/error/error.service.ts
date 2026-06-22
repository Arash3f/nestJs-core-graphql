import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { NodeEnvType } from "@src/modules/config/types/config.type"
import {
    CreateErrorInput,
    ErrorInfo,
    ErrorType,
    FindErrorInput,
    TranslationMapRecordType,
} from "@src/modules/error/constants/type"
import { GlobalError } from "@src/modules/error/error-manager"
import { GraphQLFormattedError } from "graphql"

@Injectable()
export class ErrorService {
    /**
     * * All project errors are saved in this object
     */
    private translationMap: TranslationMapRecordType = {}

    /**
     * * Generate new Translation for Error
     * @param errInfo Target error for generate
     * @returns The result of the operation
     */
    createNewErrorTranslation(errInfo: ErrorInfo): boolean {
        errInfo.statusCode = errInfo.statusCode || HttpStatus.BAD_REQUEST
        this.translationMap[errInfo.module] =
            this.translationMap[errInfo.module] || {}
        this.translationMap[errInfo.module][errInfo.code] = errInfo
        return true
    }

    /**
     * * Find error in translationMap
     * @param error Target Error
     * @returns Error found or null
     */
    private findErrorTranslation(error: FindErrorInput): ErrorInfo {
        const { code, module } = error
        return this.translationMap[module]
            ? this.translationMap[module][code]
            : null
    }

    /**
     * * Throw error to Client
     * @param errorData Target error data
     * @returns Throw Error to Client
     * @example
     * ```ts
     * Location: In auth.service.ts
     * export class AuthService {
     *
     *      constructor(
     *          private error: ErrorService,
     *      ) {}
     *
     *      private async verifyUserExistanceByUserId(userId: string): Promise<Users> {
     *          const user = await this.prisma.users.findUnique({
     *              where: {
     *                  id: userId,
     *              },
     *          });
     *
     *          if (!user) throw this.error.throwErrorToClient({ errorData: AuthErrors.UserNotFound });
     *
     *          return user;
     *      }
     *
     * }
     * ```
     */
    throwErrorToClient({
        errorData,
    }: {
        errorData: CreateErrorInput
    }): GlobalError {
        const { code, error, module } = errorData
        const candidateError =
            this.findErrorTranslation({ module, code }) ||
            this.findErrorTranslation(AuthErrors.UserIsNotAuthorized)

        return new GlobalError(candidateError, error)
    }

    /**
     * * Parsing Error and Throw it to client side
     * @param gqlError Graphql Formatted Error
     * @returns new error
     */
    static errorFilter(
        gqlError: GraphQLFormattedError,
        config: EnvConfigService,
    ): ErrorType {
        const logger = new Logger(ErrorService.name)
        const originalError = gqlError.extensions?.originalError
        const appError = gqlError.message
        const productMode = config.nodeEnv == NodeEnvType.Production
        const erroObject: ErrorType = {
            message: undefined,
        }

        /**
         * * Parsing error
         */
        if (originalError) {
            const res: ErrorType = gqlError.extensions
                .originalError as ErrorInfo
            erroObject.message = res.message || gqlError.message
            erroObject.persianTranslation = res.persianTranslation
            erroObject.code = res.code
            erroObject.module = res.module
            erroObject.statusCode = res.statusCode
        } else if (appError) {
            erroObject.message = appError
        }

        const obj = {
            module: productMode ? undefined : erroObject.module,
            code: productMode ? undefined : erroObject.code,
            message: productMode ? undefined : erroObject.message,
            developerMessage: productMode
                ? undefined
                : erroObject.developerMessage,
            persianTranslation: productMode
                ? undefined
                : erroObject.persianTranslation,
            statusCode: productMode ? undefined : erroObject.statusCode,
            timestamp: new Date().toISOString(),
        }

        /**
         * * Remove undefined key
         */
        const error: ErrorType = JSON.parse(JSON.stringify(obj)) as ErrorType

        if (config.nodeEnv == NodeEnvType.Production) {
            delete error.developerMessage
        } else if (config.nodeEnv == NodeEnvType.Development) {
            logger.error(error)
        }
        return error
    }
}
