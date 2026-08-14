import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Built directly from the lightweight config (no providers) rather than
// importing the full auth.ts, which pulls in bcrypt and the Prisma/Turso
// driver adapter for its Credentials provider — none of that is needed
// here, since route-guarding only ever needs to read/verify an existing
// JWT. Keeps this function small and free of DB-touching dependencies
// regardless of which runtime it deploys to.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/messages") ||
    req.nextUrl.pathname.startsWith("/collab-projects");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/messages/:path*", "/collab-projects/:path*"],
};
