// src/app/api/leads/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Lead from "@/models/lead";
import { verifyToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  // await dbConnect();
  try {
    const { leadId } = await req.json();
    // console.log("Assign Lead API")
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    await Lead.findByIdAndUpdate(leadId, { assigned_to: decoded.data._id, assigned: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 });
  }
}