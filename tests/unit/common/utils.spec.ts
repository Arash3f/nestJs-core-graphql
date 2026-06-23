import type { Request } from "express"
import { createHash } from "crypto"
import { getDeviceFingerprint } from "@src/common/utils/device-fingerprint.util"
import { getJwtFromRequest } from "@src/common/utils/jwt-extract.util"

const reqWithHeaders = (headers: Record<string, string | undefined>): Request =>
  ({ headers }) as unknown as Request

// sha256("") — the value a request with no User-Agent always hashes to.
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

describe("getDeviceFingerprint", () => {
  it("returns the hex sha256 of the User-Agent", () => {
    const ua = "Mozilla/5.0 (Test)"
    const expected = createHash("sha256").update(ua).digest("hex")

    expect(getDeviceFingerprint(reqWithHeaders({ "user-agent": ua }))).toBe(expected)
  })

  it("is stable for the same User-Agent and differs for another", () => {
    const a = getDeviceFingerprint(reqWithHeaders({ "user-agent": "agent-a" }))
    const b = getDeviceFingerprint(reqWithHeaders({ "user-agent": "agent-a" }))
    const c = getDeviceFingerprint(reqWithHeaders({ "user-agent": "agent-b" }))

    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it("hashes the empty string when no User-Agent is present", () => {
    expect(getDeviceFingerprint(reqWithHeaders({}))).toBe(EMPTY_SHA256)
  })
})

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
