import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { AppException } from "@src/app.exception"
import { getRequest } from "@src/common/utils/get-request.util"
import { AuthErrors } from "@src/modules/auth/constants/errors"

/**
 * Param decorator that returns the authenticated user's ID from `req.user`.
 *
 * @remarks
 * Relies on {@link TokenGuard} (registered globally) having populated `req.user`.
 * Throws `AppException(AuthErrors.UserIsNotAuthorized)` when `req.user?.id` is absent,
 * so it doubles as a "must be logged in" assertion at the param level.
 *
 * @returns The authenticated user's ID.
 * @throws {AppException} `AuthErrors.UserIsNotAuthorized` when no authenticated user is present.
 *
 * @example
 * ```ts
 * @Query(() => UserModel)
 * me(@GetUserId() userId: string) {}
 * ```
 */
export const GetUserId = createParamDecorator<unknown, string>(
  (_data: unknown, context: ExecutionContext) => {
    const req = getRequest(context)

    const userId = req.user?.id

    if (!userId) {
      throw new AppException(AuthErrors.UserIsNotAuthorized)
    }

    return userId
  },
)
