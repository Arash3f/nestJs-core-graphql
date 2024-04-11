import { HttpException } from "@nestjs/common"
import { ErrorInfo } from "@src/modules/error/constants/type"

/**
 * * Create new error exception for Override Project Errors
 */
export class GlobalError extends HttpException {
    constructor(
        public errorContext: ErrorInfo,
        public error: Error,
    ) {
        super(errorContext, errorContext.statusCode)
    }
}
