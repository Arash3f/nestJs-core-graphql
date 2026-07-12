import type { CanActivate, ExecutionContext } from "@nestjs/common"
import { Injectable } from "@nestjs/common"
import { Role } from "@prisma/client"
import { AppException } from "@src/app.exception"
import { getRequest } from "@src/common/utils/get-request.util"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { PrismaService } from "@src/modules/prisma/prisma.service"

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  /**
   * Allows the request only when the authenticated user has the `Admin` role and is still active.
   *
   * The `active` flag is re-read from the database on every call so a soft-deleted
   * (deactivated) admin loses access immediately, even though its previously issued
   * — and still cryptographically valid — token keeps decoding.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` when the user is an active admin.
   * @throws {AppException} AuthErrors.UserIsNotAuthorized - When no authenticated user is attached to the request.
   * @throws {AppException} AuthErrors.AccessDenied - When the authenticated user is not an active admin.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = getRequest(context)

    if (!req.user) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    /**
     * Verify User Role and active state
     */
    const findUser = await this.prisma.users.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        role: true,
        active: true,
      },
    })

    if (!findUser?.active || findUser.role !== Role.Admin) {
      throw new AppException(AuthErrors.AccessDenied)
    }

    return true
  }
}
