import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { AppException } from "@src/app.exception"
import { getRequest } from "@src/common/utils/get-request.util"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { PrismaService } from "@src/modules/prisma/prisma.service"

@Injectable()
export class IsLoggedInGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  /**
   * Allows the request only when an authenticated, still-active user is attached to it.
   *
   * Re-reads the user's `active` flag from the database on every call so that a
   * soft-deleted (deactivated) account loses access immediately, even though its
   * previously issued — and still cryptographically valid — token keeps decoding.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` when `req.user` is present and the account is active.
   * @throws {AppException} AuthErrors.UserIsNotAuthorized - When no authenticated user is attached, or the account no longer exists / has been deactivated.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequest(context)
    if (!request.user) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    const user = await this.prisma.users.findUnique({
      where: { id: request.user.id },
      select: { active: true },
    })

    if (!user?.active) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    return true
  }
}
