import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { getRequest } from "@src/common/utils/get-request.util"
import { getJwtFromRequest } from "@src/common/utils/jwt-extract.util"

/**
 * Custom decorator that extracts the JWT token from an incoming request.
 *
 * @description
 * Retrieves the JWT token from the request's `Authorization` header via
 * {@link getJwtFromRequest}.
 *
 * @param _data - Unused parameter (required by NestJS decorator signature)
 * @param context - NestJS execution context providing access to the request
 * @returns The extracted JWT token as a string, or an empty string if no token is found
 *
 * @example
 * ```ts
 * \@Mutation(() => LoginOutput)
 * logIn(@GetJwtToken() token: string) {}
 * ```
 */
export const GetJwtToken = createParamDecorator<string>(
  (_data: unknown, context: ExecutionContext) => {
    const req = getRequest(context)
    return getJwtFromRequest(req)
  },
)
