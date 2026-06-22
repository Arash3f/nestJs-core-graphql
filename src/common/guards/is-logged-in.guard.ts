import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { AppException } from "@src/app.exception"
import { AuthenticatedRequest } from "@src/common/types/request.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"

@Injectable()
export class IsLoggedInGuard implements CanActivate {
  /**
   * Allows the request only when an authenticated user is attached to it.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` when `req.user` is present.
   * @throws {AppException} AuthErrors.UserIsNotAuthorized - When no authenticated user is attached to the request.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = GqlExecutionContext.create(context).getContext<{ req: AuthenticatedRequest }>()
      .req
    if (!request.user) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    return true
  }
}
