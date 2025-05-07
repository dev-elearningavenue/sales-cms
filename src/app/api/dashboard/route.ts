import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics, getSalespersonMetrics } from "@/controllers/dashboardController";
import { getDataFromToken } from "@/utils/get_token_data";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Get current user from token
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();
    const userType = Number(tokenData.user_type);

    // Determine which metrics to fetch based on user type
    if (userType === 1 || userType === 2) {
      // Admin or Manager - get all salespeople metrics
      const result = await getDashboardMetrics();
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } else if (userType === 3) {
      // Salesperson - get their own metrics
      const result = await getSalespersonMetrics(userId);
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user type",
        },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error("Error in dashboard metrics API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch dashboard metrics",
      },
      { status: 500 }
    );
  }
} 