import "reflect-metadata"
import type { ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { GetIp } from "@src/common/decorators/get-ip.decorator"
import { GetUserId } from "@src/common/decorators/get-user-id.decorator"
import { AuthErrors } from "@src/modules/auth/constants/errors"

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown

/**
 * `createParamDecorator` hides its factory; this recovers it by applying the
 * decorator to a throwaway method and reading the route-args metadata Nest stores.
 */
const getFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class Probe {
    handler(@decorator() _value: unknown): void {}
  }
  const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, "handler")
  return meta[Object.keys(meta)[0]].factory
}

/**
 * Builds a minimal GraphQL ExecutionContext exposing the given request. The
 * decorators read it via `GqlExecutionContext.create(ctx).getContext().req`, so
 * the request sits at resolver-arg index 2 (`getContext()`).
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

describe("GetUserId", () => {
  const factory = getFactory(GetUserId as unknown as () => ParameterDecorator)

  it("returns the authenticated user's id", () => {
    expect(factory(undefined, contextFor({ user: { id: "user-1" } }))).toBe("user-1")
  })

  it("throws UserIsNotAuthorized when no user is attached", () => {
    expect(() => factory(undefined, contextFor({}))).toThrow(AuthErrors.UserIsNotAuthorized.message)
  })
})

describe("GetIp", () => {
  const factory = getFactory(GetIp as unknown as () => ParameterDecorator)

  it("returns req.ip by default and normalizes IPv4-mapped IPv6", () => {
    expect(factory(undefined, contextFor({ ip: "::ffff:127.0.0.1", headers: {} }))).toBe(
      "127.0.0.1",
    )
  })

  it("ignores proxy headers unless trustProxyHeaders is set", () => {
    const req = { ip: "10.0.0.1", headers: { "x-real-ip": "1.2.3.4" } }
    expect(factory(undefined, contextFor(req))).toBe("10.0.0.1")
  })

  it("prefers cf-connecting-ip when trusting proxy headers", () => {
    const req = {
      ip: "10.0.0.1",
      headers: { "cf-connecting-ip": "9.9.9.9", "x-real-ip": "1.2.3.4" },
    }
    expect(factory({ trustProxyHeaders: true }, contextFor(req))).toBe("9.9.9.9")
  })

  it("falls back to the first x-forwarded-for IP when trusting proxy headers", () => {
    const req = { ip: "10.0.0.1", headers: { "x-forwarded-for": "5.5.5.5, 6.6.6.6" } }
    expect(factory({ trustProxyHeaders: true }, contextFor(req))).toBe("5.5.5.5")
  })
})
