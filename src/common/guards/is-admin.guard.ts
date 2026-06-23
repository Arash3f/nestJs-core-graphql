import type { CanActivate, ExecutionContext } from "@nestjs/common"
import { Injectable } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { AppException } from "@src/app.exception"
import { AuthenticatedRequest } from "@src/common/types/request.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { PrismaService } from "@src/modules/prisma/prisma.service"

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  /**
   * Allows the request only when the authenticated user has the `Admin` role.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` when the user is an admin.
   * @throws {AppException} AuthErrors.UserIsNotAuthorized - When no authenticated user is attached to the request.
   * @throws {AppException} AuthErrors.AccessDenied - When the authenticated user is not an admin.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = GqlExecutionContext.create(context).getContext<{ req: AuthenticatedRequest }>().req

    if (!req.user) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    /**
     * Verify User Role
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

    if (!findUser?.active) {
      throw new AppException(AuthErrors.InactiveUser)
    }

    if (findUser.role !== Role.Admin) {
      throw new AppException(AuthErrors.AccessDenied)
    }

    return true
  }
}
