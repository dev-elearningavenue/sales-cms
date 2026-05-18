import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getDataFromToken } from "@/utils/get_token_data";
import { uploadManagerLeadsCSV, getNextManagerLead } from "@/controllers/managerLeadController";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const source = formData.get("source") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "File is required" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 50MB." },
        { status: 413 }
      );
    }

    const userId = String(tokenData._id);
    const result = await uploadManagerLeadsCSV(file, userId, source || undefined);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message }, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Manager lead CSV upload error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const result = await getNextManagerLead(
      tokenData._id as string,
      (tokenData as any)?.assignedDomain || ""
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error("Get manager lead error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
