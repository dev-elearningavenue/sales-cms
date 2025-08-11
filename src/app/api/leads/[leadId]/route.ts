import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import { getLeadById } from "@/controllers/leadController";

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    // Check authentication
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { leadId } = params;

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Lead ID is required" },
        { status: 400 }
      );
    }

    // Get lead from controller
    const result = await getLeadById(leadId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.message === "Lead not found" ? 404 : 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch lead" },
      { status: 500 }
    );
  }
} 