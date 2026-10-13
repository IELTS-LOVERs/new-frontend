import { NextResponse, type NextRequest } from "next/server"

interface DecodedJwt {
  id?: string
  role?: "student" | "teacher" | "admin"
  email?: string
  exp?: number
}

/**
 * Decode JWT payload on Edge Runtime without external libraries.
 */
function decodeJwt(token: string): DecodedJwt | null {
  try {
    if (!token || typeof token !== "string") return null
    // Support mock / demo token in development/test
    if (token.startsWith("mock-")) {
      return { id: "mock-user", exp: Math.floor(Date.now() / 1000) + 86400 }
    }
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const decodedText = new TextDecoder().decode(bytes)
    return JSON.parse(decodedText) as DecodedJwt
  } catch {
    return null
  }
}

/**
 * Check whether token exists and is not expired.
 */
function isTokenValid(token?: string): boolean {
  if (!token) return false
  const decoded = decodeJwt(token)
  if (!decoded) return false
  if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
    return false // Token expired
  }
  return true
}

/**
 * Extract user role from token payload or role cookie fallback.
 */
function getUserRole(token?: string, roleCookie?: string): "student" | "teacher" | "admin" {
  if (token) {
    const decoded = decodeJwt(token)
    if (decoded?.role && ["student", "teacher", "admin"].includes(decoded.role)) {
      return decoded.role
    }
  }
  if (roleCookie && ["student", "teacher", "admin"].includes(roleCookie)) {
    return roleCookie as "student" | "teacher" | "admin"
  }
  return "student"
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const tokenCookie = request.cookies.get("ielts_access_token")?.value
  const roleCookie = request.cookies.get("ielts_user_role")?.value
  const isAuthenticated = isTokenValid(tokenCookie)
  const role = isAuthenticated ? getUserRole(tokenCookie, roleCookie) : null

  const isAuthRoute = pathname === "/login" || pathname === "/register"
  const isStudentRoute = pathname.startsWith("/student")
  const isTeacherRoute = pathname.startsWith("/teacher")
  const isAdminRoute = pathname.startsWith("/admin")
  const isExamRoute = pathname.startsWith("/exam")
  const isProtectedRoute = isStudentRoute || isTeacherRoute || isAdminRoute || isExamRoute

  // ─── 1. Already authenticated users visiting Auth routes (/login, /register)
  if (isAuthRoute) {
    if (isAuthenticated && role) {
      const nextParam = request.nextUrl.searchParams.get("next")
      const fallback = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student"
      const targetUrl = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("/login") ? nextParam : fallback
      return NextResponse.redirect(new URL(targetUrl, request.url))
    }
    return NextResponse.next()
  }

  // ─── 2. Unauthenticated access to protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`)
    const loginUrl = new URL(`/login?next=${returnUrl}`, request.url)
    const response = NextResponse.redirect(loginUrl)

    // Clear stale or expired cookies
    if (tokenCookie) {
      response.cookies.delete("ielts_access_token")
      response.cookies.delete("ielts_user_role")
    }
    return response
  }

  // ─── 3. Role-based route authorization
  if (isAuthenticated && role) {
    // Student attempting to access Teacher area
    if (isTeacherRoute && role === "student") {
      return NextResponse.redirect(new URL("/student", request.url))
    }

    // Non-admin attempting to access Admin area
    if (isAdminRoute && role !== "admin") {
      const target = role === "teacher" ? "/teacher" : "/student"
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static build files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - static media extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico, .mp3, .mp4, .wav)
     * - api routes (/api/*) handled by Next.js rewrites/proxy to backend
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav)$).*)",
  ],
}
