// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./utils/auth";

export async function middleware(req: NextRequest) {
  // Handle large file uploads for company-leads API
  if (req.nextUrl.pathname === '/api/company-leads' && req.method === 'POST') {
    // Increase timeout and body size limit for this specific route
    const response = NextResponse.next();
    response.headers.set('X-Request-Timeout', '30000'); // 5 minutes
    response.headers.set('X-Body-Size-Limit', '52428800'); // 50MB
    return response;
  }

  // Next.js middleware mein req object modify nahi kar sakte
  // Yahan req.user set nahi kar sakte
  const token = req.cookies.get("token")?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  if (isAuthPage && token) {
    // console.log("login successful.");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!token && !isAuthPage) {
    // console.log("No token found, can't access protected routes");
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (token) {
    try {
      const result = await verifyToken(token);
      
      if (!result.success) {
        console.log("Invalid token, redirecting to login at ", new Date().toLocaleString('en-US'));
        // Clear the invalid cookie
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.set({
          name: "token",
          value: "",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 0,
        });
        return response;
      }
      return NextResponse.next();
    } catch (error) {
      console.error("Token verification error:", error);
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.set({
        name: "token",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
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
    "/company-leads/:path*",
    "/my-assigned-leads/:path*",
    "/api/company-leads/:path*",
    "/login",
  ],
};
