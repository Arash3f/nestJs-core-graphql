import type { CanActivate, ExecutionContext } from "@nestjs/common"
import { Injectable } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { JwtService } from "@nestjs/jwt"
import { AuthenticatedRequest, JwtPayload, RequestUser } from "@src/common/types/request.type"
import { getDeviceFingerprint } from "@src/common/utils/device-fingerprint.util"
import { getJwtFromRequest } from "@src/common/utils/jwt-extract.util"

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Decodes the bearer JWT and attaches `req.user` when it verifies and the token's
   * device fingerprint matches the calling device.
   *
   * Non-blocking by design: it never rejects the request. A missing, malformed, invalid,
   * or device-mismatched token simply leaves `req.user` unset — downstream guards enforce
   * authorization. A token issued on one device (e.g. a phone) therefore fails to
   * authenticate when replayed from another device (e.g. a laptop), since the request's
   * User-Agent fingerprint no longer matches the `deviceId` claim baked into the token.
   *
   * @param context - The execution context for the incoming request.
   * @returns `true` always.
   */
  canActivate(context: ExecutionContext): boolean {
    const req = GqlExecutionContext.create(context).getContext<{ req: AuthenticatedRequest }>().req

    const token = getJwtFromRequest(req)
    if (!token) return true

    try {
      const payload = this.jwtService.verify<JwtPayload>(token)

      // Bind the token to its issuing device: a token replayed from a different
      // device has a mismatching fingerprint and is treated as unauthenticated.
      if (payload.deviceId && payload.deviceId !== getDeviceFingerprint(req)) {
        return true
      }

      const userPayload: RequestUser = {
        id: payload.id,
        username: payload.username,
      }

      req.user = userPayload
    } catch {
      return true
    }

    return true
  }
}
