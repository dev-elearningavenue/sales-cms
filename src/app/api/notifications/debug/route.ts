import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { checkNotifications, createNewLeadNotification } from "@/services/notificationService";
import { getDataFromToken } from "@/utils/get_token_data";
import Lead from "@/models/lead";

// Connect to database
connectDB();

// GET: Debug endpoint to check notifications in the database
export async function GET(req: Request) {
  try {
    // Check if user is admin
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin or manager users (types 1 and 2)
    const userType = typeof tokenData.user_type === "number" ? tokenData.user_type : 3;
    if (userType > 2) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Get notification statistics and recent notifications
    const result = await checkNotifications();
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error in debug notifications endpoint:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a test notification for the most recent lead
export async function POST(req: Request) {
  try {
    // Check if user is admin
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin or manager users (types 1 and 2)
    const userType = typeof tokenData.user_type === "number" ? tokenData.user_type : 3;
    if (userType > 2) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Get the most recent lead
    const mostRecentLead = await Lead.findOne().sort({ createdAt: -1 });
    
    if (!mostRecentLead) {
      return NextResponse.json(
        { success: false, message: "No leads found in the database" },
        { status: 404 }
      );
    }
    
    // Create a test notification for this lead
    const result = await createNewLeadNotification(mostRecentLead);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: "Test notification created successfully",
        leadId: mostRecentLead._id,
        leadCategory: mostRecentLead.category,
        leadDomain: mostRecentLead.domain
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Failed to create test notification" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating test notification:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
} 