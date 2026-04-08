import { NextRequest, NextResponse } from "next/server";
import { findExternalUserById } from "@/controllers/externalUserController";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const domain = searchParams.get("domain");

    if (!userId || !domain) {
      return NextResponse.json({ success: false, message: "Missing userId or domain" }, { status: 400 });
    }

    const result = await findExternalUserById(userId, domain);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: result.user });
  } catch (err: any) {
    console.error("/api/external-user error:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal error" }, { status: 500 });
  }
}


