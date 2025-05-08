import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import { getDashboardMetrics, getSalespersonMetrics } from "@/controllers/dashboardController";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Get current user from token
    const tokenData = await getDataFromToken();
    
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized",
      }, { status: 401 });
    }
    
    const userId = tokenData._id.toString();
    const userType = Number(tokenData.user_type);
    
    // Extract date parameters from URL
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    
    // Parse the date parameters if provided
    const dateFilter: { startDate?: Date; endDate?: Date } = {};
    if (startDateParam) {
      dateFilter.startDate = new Date(startDateParam);
    }
    
    if (endDateParam) {
      // Set the end date to the end of the day to include all records from that day
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.endDate = endDate;
    }
    
    let response;
    
    // Fetch appropriate data based on user type
    if (userType === 3) { // Salesperson
      response = await getSalespersonMetrics(userId, 
        startDateParam || endDateParam ? dateFilter : undefined);
    } else { // Admin or Manager
      response = await getDashboardMetrics(
        startDateParam || endDateParam ? dateFilter : undefined);
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in dashboard API:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
} 