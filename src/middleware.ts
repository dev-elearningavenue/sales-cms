// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./utils/auth";

export async function middleware(req: NextRequest) {
  // Next.js middleware mein req object modify nahi kar sakte
  // Yahan req.user set nahi kar sakte
  const token = req.cookies.get("token")?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  if (isAuthPage && token) {
    console.log("login successful.");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!token && !isAuthPage) {
    console.log("No token found, can't access protected routes");
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (token) {
    const result = await verifyToken(token);
    if (!result.success) {
      console.log("Invalid token, redirecting to login");
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/profile/:path*",
    "/leads/:path*",
    "/settings/:path*",
    "/invoice/:path*",
    "/my-leads/:path*",
    "/login",
  ],
};
