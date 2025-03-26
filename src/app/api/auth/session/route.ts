// src/app/api/auth/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
 
export async function GET(req: NextRequest, res: NextResponse) {
  // Server-side session verification
  // Returns user data if token is valid
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token");
    // console.log("SSR Token in auth/session.ts: ", token);

    if (!token) {
      return NextResponse.json({ message: "No token found" }, { status: 401 });
    }

    const result = await verifyToken(token.value);

    if (!result.success) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error in session.ts", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
