import { NextResponse } from "next/server";
import jwt, { JwtPayload }from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  const token = cookies().get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    return NextResponse.json({ email: decoded.email });
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}