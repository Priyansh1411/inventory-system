// /middleware.ts  (PROJECT ROOT)
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Public routes (allow through)
  if (
    pathname === "/login" ||
    pathname === "/register" ||          // <-- added
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth") ||  // <-- allow next-auth API
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // Check next-auth session cookie (dev/prod names)
  const hasSession =
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protect everything except assets and /api/auth
export const config = {
  matcher: ["/((?!_next|favicon\\.ico|public).*)", "/api/(?!auth).*"],
};