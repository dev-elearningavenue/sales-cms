import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getDataFromToken } from "@/utils/get_token_data";
import { updateManagerLeadStatus } from "@/controllers/managerLeadController";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

connectToDatabase().catch(console.error);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized Person." }, { status: 401 });
    }

    const body = await request.json();
    const leadId = params.id;
    const result = await updateManagerLeadStatus(leadId, body, tokenData._id as string);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Manager lead status update route error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
