import { describe, expect, it } from "vitest"
import { decodeJwtExpMs, decodeJwtExpSeconds } from "./auth-session"

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function makeToken(payload: Record<string, unknown>): string {
  return `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify(payload)
  )}.signature`
}

describe("JWT expiry helpers", () => {
  const exp = 1_800_000_000

  it("decodeJwtExpSeconds returns the exp claim in seconds", () => {
    expect(decodeJwtExpSeconds(makeToken({ exp }))).toBe(exp)
  })

  it("decodeJwtExpMs returns the exp claim in milliseconds", () => {
    expect(decodeJwtExpMs(makeToken({ exp }))).toBe(exp * 1000)
  })

  it("returns null for a missing or malformed token", () => {
    expect(decodeJwtExpSeconds(null)).toBeNull()
    expect(decodeJwtExpSeconds(undefined)).toBeNull()
    expect(decodeJwtExpSeconds("not-a-jwt")).toBeNull()
    expect(decodeJwtExpMs("not-a-jwt")).toBeNull()
  })

  it("returns null when the payload has no numeric exp", () => {
    expect(decodeJwtExpSeconds(makeToken({ sub: "user-1" }))).toBeNull()
  })
})
