import type { ExecutionContext } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { Role } from "@prisma/client"
import { IsAdminGuard } from "@src/common/guards/is-admin.guard"
import { IsLoggedInGuard } from "@src/common/guards/is-logged-in.guard"
import { TokenGuard } from "@src/common/guards/token.guard"
import { getDeviceFingerprint } from "@src/common/utils/device-fingerprint.util"
import { AuthErrors } from "@src/modules/auth/constants/errors"

/**
 * Builds a minimal GraphQL ExecutionContext that exposes the given request.
 *
 * The guards read the request via `getRequest()` → `GqlExecutionContext`,
 * so the mock mimics the resolver-args shape `[root, args, { req }, info]` that
 * `GqlExecutionContext` reads (the request lives at arg index 2, `getContext()`).
 */
const contextFor = (req: unknown): ExecutionContext => {
  const gqlArgs = [undefined, undefined, { req }, undefined]
  return {
    getType: () => "graphql",
    getArgs: () => gqlArgs,
    getClass: () => null,
    getHandler: () => null,
  } as unknown as ExecutionContext
}

describe("IsLoggedInGuard", () => {
  let guard: IsLoggedInGuard
  const mockPrisma = { users: { findUnique: jest.fn() } }

  beforeEach(() => {
    jest.clearAllMocks()
    guard = new IsLoggedInGuard(mockPrisma as never)
  })

  it("allows the request when req.user is present and the account is active", async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ active: true })

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).resolves.toBe(true)
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      select: { active: true },
    })
  })

  it("throws UserIsNotAuthorized when req.user is missing", async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      AuthErrors.UserIsNotAuthorized.message,
    )
    expect(mockPrisma.users.findUnique).not.toHaveBeenCalled()
  })

  it("throws UserIsNotAuthorized when the user row no longer exists", async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null)

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).rejects.toThrow(
      AuthErrors.UserIsNotAuthorized.message,
    )
  })

  it("throws UserIsNotAuthorized when the account has been deactivated", async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ active: false })

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).rejects.toThrow(
      AuthErrors.UserIsNotAuthorized.message,
    )
  })
})

describe("IsAdminGuard", () => {
  let guard: IsAdminGuard
  const mockPrisma = { users: { findUnique: jest.fn() } }

  beforeEach(() => {
    jest.clearAllMocks()
    guard = new IsAdminGuard(mockPrisma as never)
  })

  it("allows the request when the user is an active Admin", async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ role: Role.Admin, active: true })

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).resolves.toBe(true)
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      select: { role: true, active: true },
    })
  })

  it("throws UserIsNotAuthorized when there is no authenticated user", async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      AuthErrors.UserIsNotAuthorized.message,
    )
    expect(mockPrisma.users.findUnique).not.toHaveBeenCalled()
  })

  it("throws AccessDenied when the user is an active non-Admin", async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ role: Role.Member, active: true })

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).rejects.toThrow(
      AuthErrors.AccessDenied.message,
    )
  })

  it("throws AccessDenied when the admin account has been deactivated", async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ role: Role.Admin, active: false })

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).rejects.toThrow(
      AuthErrors.AccessDenied.message,
    )
  })

  it("throws AccessDenied when the user row no longer exists", async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null)

    await expect(guard.canActivate(contextFor({ user: { id: "1" } }))).rejects.toThrow(
      AuthErrors.AccessDenied.message,
    )
  })
})

describe("TokenGuard", () => {
  let guard: TokenGuard
  const mockJwt = { verify: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    guard = new TokenGuard(mockJwt as unknown as JwtService)
  })

  const requestWith = (token?: string, userAgent = "agent") => ({
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "user-agent": userAgent,
    },
  })

  it("returns true and leaves req.user unset when no token is present", () => {
    const req = requestWith()
    expect(guard.canActivate(contextFor(req))).toBe(true)
    expect((req as Record<string, unknown>).user).toBeUndefined()
    expect(mockJwt.verify).not.toHaveBeenCalled()
  })

  it("leaves req.user unset for a valid token without a device claim", () => {
    const req = requestWith("tok")
    mockJwt.verify.mockReturnValue({ id: "1", username: "u" })

    expect(guard.canActivate(contextFor(req))).toBe(true)
    expect((req as Record<string, unknown>).user).toBeUndefined()
  })

  it("attaches req.user when the device fingerprint matches the token claim", () => {
    const req = requestWith("tok", "matching-agent")
    const deviceId = getDeviceFingerprint(req as never)
    mockJwt.verify.mockReturnValue({ id: "1", username: "u", deviceId })

    expect(guard.canActivate(contextFor(req))).toBe(true)
    expect((req as Record<string, unknown>).user).toEqual({ id: "1", username: "u" })
  })

  it("leaves req.user unset when the token's device claim does not match", () => {
    const req = requestWith("tok")
    mockJwt.verify.mockReturnValue({ id: "1", username: "u", deviceId: "different-device" })

    expect(guard.canActivate(contextFor(req))).toBe(true)
    expect((req as Record<string, unknown>).user).toBeUndefined()
  })

  it("swallows verification errors and leaves req.user unset", () => {
    const req = requestWith("tok")
    mockJwt.verify.mockImplementation(() => {
      throw new Error("invalid signature")
    })

    expect(guard.canActivate(contextFor(req))).toBe(true)
    expect((req as Record<string, unknown>).user).toBeUndefined()
  })
})
