import type { Request } from "express"
import { getJwtFromRequest } from "@src/common/utils/jwt-extract.util"

const reqWithHeaders = (headers: Record<string, string | undefined>): Request =>
  ({ headers }) as unknown as Request

describe("getJwtFromRequest", () => {
  it("returns an empty string when there is no Authorization header", () => {
    expect(getJwtFromRequest(reqWithHeaders({}))).toBe("")
  })

  it("returns a bare token passed as a single value", () => {
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "raw-token" }))).toBe("raw-token")
  })

  it("strips the Bearer scheme (case-insensitive)", () => {
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "Bearer abc" }))).toBe("abc")
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "bearer abc" }))).toBe("abc")
  })

  it("strips the JWT scheme", () => {
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "JWT xyz" }))).toBe("xyz")
  })

  it("returns an empty string for an unknown scheme", () => {
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "Basic abc" }))).toBe("")
  })

  it("returns an empty string for malformed (3+ part) headers", () => {
    expect(getJwtFromRequest(reqWithHeaders({ authorization: "Bearer a b" }))).toBe("")
  })
})
