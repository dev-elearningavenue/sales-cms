import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getDataFromToken } from "@/utils/get_token_data";
import { updateCompanyLeadStatus } from "@/controllers/companyLeadController";

// Route segment config for App Router
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for status updates

connectToDatabase().catch(console.error);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    // console.log("Token data:", tokenData);
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized Person." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const leadId = params.id;

    // console.log("Status update request:", { leadId, body });
    const result = await updateCompanyLeadStatus(leadId, body, tokenData._id as string);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Status update route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
