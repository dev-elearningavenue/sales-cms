import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import { getLeadHistory } from "@/controllers/leadController";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const domain = searchParams.get("domain");

    if (!email || !domain) {
      return NextResponse.json(
        { success: false, message: "Email and domain are required" },
        { status: 400 }
      );
    }

    // Get lead history from controller (now uses direct email field)
    const result = await getLeadHistory(email, domain);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching lead history:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch lead history" },
      { status: 500 }
    );
  }
}
