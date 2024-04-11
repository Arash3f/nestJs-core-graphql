import { CanActivate, ExecutionContext, Inject } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { TokenGuardData } from "@src/common/types/token.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { ErrorService } from "@src/modules/error/error.service"

/**
 * * This guard performs user's role to be Admin
 */
export class IsAdmin implements CanActivate {
    constructor(@Inject(ErrorService) private error: ErrorService) {}

    canActivate(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context)
        const request = ctx.getContext().req
        const tokenData: TokenGuardData = request.headers._tokenGuard

        if (tokenData?.user) {
            if (tokenData.user.role == Role.Admin) return true
        }
        throw this.error.throwErrorToClient({
            errorData: AuthErrors.AccessDenied,
        })
    }
}
