import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { AppException } from "@src/app.exception"
import { AuthenticatedRequest } from "@src/common/types/request.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { PrismaService } from "@src/modules/prisma/prisma.service"

@Injectable()
export class IsLoggedInGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  /**
   * Allows the request only when an authenticated, still-active user is attached
   * to it. The token alone is not enough — a deactivated account is rejected even
   * while it holds a valid (not-yet-expired) access token.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` when `req.user` is present and the account is active.
   * @throws {AppException} AuthErrors.UserIsNotAuthorized - When no authenticated user is attached to the request.
   * @throws {AppException} AuthErrors.InactiveUser - When the authenticated account has been deactivated.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = GqlExecutionContext.create(context).getContext<{ req: AuthenticatedRequest }>()
      .req
    if (!request.user) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    const user = await this.prisma.users.findUnique({
      where: { id: request.user.id },
      select: { active: true },
    })

    if (!user) throw new AppException(AuthErrors.UserIsNotAuthorized)
    if (!user.active) throw new AppException(AuthErrors.InactiveUser)

    return true
  }
}
