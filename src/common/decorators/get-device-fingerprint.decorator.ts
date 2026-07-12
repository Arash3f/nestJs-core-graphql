import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { getDeviceFingerprint } from "@src/common/utils/device-fingerprint.util"
import { getRequest } from "@src/common/utils/get-request.util"

/**
 * Param decorator that returns the calling device's fingerprint, derived from
 * the request's `User-Agent` header via {@link getDeviceFingerprint}.
 *
 * @remarks
 * Used by the auth flows to bind issued tokens to the device they were created
 * on. Always returns a value (the empty-string fingerprint when no `User-Agent`
 * is present); it never throws.
 *
 * @returns The hex-encoded SHA-256 fingerprint of the request's `User-Agent`.
 *
 * @example
 * ```ts
 * @Mutation(() => LoginOutput)
 * logIn(@Args("data") data: LoginInput, @GetDeviceFingerprint() deviceId: string) {}
 * ```
 */
export const GetDeviceFingerprint = createParamDecorator<unknown, string>(
  (_data: unknown, context: ExecutionContext) => {
    const req = getRequest(context)
    return getDeviceFingerprint(req)
  },
)
