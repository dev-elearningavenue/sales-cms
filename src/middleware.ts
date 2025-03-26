// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./utils/auth";

export async function middleware(req: NextRequest) {
  // Next.js middleware mein req object modify nahi kar sakte
  // Yahan req.user set nahi kar sakte
  const token = req.cookies.get("token")?.value;
  // console.log("Token: ", token)
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  
  if (isAuthPage && token) {
    console.log("login successful.");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  // For all other pages, if no token or invalid token, redirect to the login page
  if (!token && !isAuthPage) {
    console.log("No token found, can't access protected routes");
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (token) {
    const result = await verifyToken(token);
    // const requestHeaders = new Headers(req.headers);  // custom headers
    // requestHeaders.set('x-user-id', result.data.userId);
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
    "/login",
    "/my-leads/:path*",
  ],
};