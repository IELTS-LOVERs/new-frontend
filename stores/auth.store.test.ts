import { describe, expect, it } from "vitest"
import { buildAuthCookieStrings } from "./auth.store"

const NOW = 1_700_000_000

function makeToken(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  return `header.${payload}.signature`
}

describe("buildAuthCookieStrings (FIX-04)", () => {
  it("sizes the access cookie to the token exp, not 7 days", () => {
    const token = makeToken(NOW + 3600)
    const [access] = buildAuthCookieStrings(token, "student", {
      secure: false,
      nowSeconds: NOW,
    })

    expect(access).toContain("ielts_access_token=")
    expect(access).toContain("max-age=3600")
  })

  it("keeps the non-sensitive role cookie on the 7-day remember-me window", () => {
    const token = makeToken(NOW + 3600)
    const [, role] = buildAuthCookieStrings(token, "teacher", {
      secure: false,
      nowSeconds: NOW,
    })

    expect(role).toContain("ielts_user_role=teacher")
    expect(role).toContain(`max-age=${7 * 24 * 60 * 60}`)
  })

  it("adds the Secure attribute when served over https", () => {
    const token = makeToken(NOW + 60)
    const cookies = buildAuthCookieStrings(token, "student", {
      secure: true,
      nowSeconds: NOW,
    })

    expect(cookies.length).toBeGreaterThan(0)
    expect(cookies.every((cookie) => cookie.includes("; Secure"))).toBe(true)
  })

  it("omits Secure over plain http", () => {
    const token = makeToken(NOW + 60)
    const cookies = buildAuthCookieStrings(token, "student", {
      secure: false,
      nowSeconds: NOW,
    })

    expect(cookies.some((cookie) => cookie.includes("Secure"))).toBe(false)
  })

  it("falls back to a 2h access cookie when the token cannot be decoded", () => {
    const [access] = buildAuthCookieStrings("not-a-jwt", undefined, {
      secure: false,
      nowSeconds: NOW,
    })

    expect(access).toContain(`max-age=${2 * 60 * 60}`)
  })
})
