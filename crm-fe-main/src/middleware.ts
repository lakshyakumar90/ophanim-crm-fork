import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is simplified since we're using localStorage for tokens
// which isn't accessible in middleware. All auth logic is now handled
// client-side in the AuthProvider.

export function middleware(request: NextRequest) {
  // Just pass through all requests - auth is handled client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
