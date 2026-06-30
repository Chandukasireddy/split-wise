import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "./lib/session";

// Define path categories
const PUBLIC_PATHS = ["/", "/login", "/signup"];
const STATIC_ASSET_REGEX = /\.(.*)$/; // files with extensions

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip next internal files, static assets, and api routes that are open (if any)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") || // public authentication API routes if any
    STATIC_ASSET_REGEX.test(pathname) ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Get and verify current session
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(sessionToken);
  const isAuthenticated = !!session;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // If logged in and attempting to access login/signup/home, redirect to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If not logged in and attempting to access a protected page, redirect to login
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    // Remember redirect path
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply proxy to all paths except static resources
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
