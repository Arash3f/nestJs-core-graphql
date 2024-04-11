import { CanActivate, ExecutionContext, Inject } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { TokenGuardData } from "@src/common/types/token.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { ErrorService } from "@src/modules/error/error.service"

/**
 * * This guard verifies requester's token to have valid token
 *
 * !Note : In our's structure to generate token, we save user object in requester's header see {@link "common/guard/token.guard".TokenGuard}
 *
 * * So we check user object for verify token
 */
export class IsLoggedIn implements CanActivate {
    constructor(@Inject(ErrorService) private error: ErrorService) {}

    canActivate(context: ExecutionContext) {
        let result = false

        const ctx = GqlExecutionContext.create(context)
        const request = ctx.getContext().req
        const tokenData: TokenGuardData = request.headers._tokenGuard

        /**
         * * Verify requester user
         */
        if (tokenData?.user) result = true
        else
            throw this.error.throwErrorToClient({
                errorData: AuthErrors.UserIsNotAuthorized,
            })

        return result
    }
}
