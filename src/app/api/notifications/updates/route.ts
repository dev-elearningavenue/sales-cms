import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/notification";
import { getDataFromToken } from "@/utils/get_token_data";

// Connect to database
connectDB();

// GET endpoint for polling new notifications
export async function GET(req: NextRequest) {
  try {
    // Get user ID from token
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();
    
    // Parse query parameters
    const url = new URL(req.url);
    const timestamp = url.searchParams.get("since");
    
    if (!timestamp) {
      return NextResponse.json(
        { message: "Missing 'since' parameter" },
        { status: 400 }
      );
    }
    
    // Get notifications since the specified timestamp
    const since = new Date(timestamp);
    
    // Find new notifications
    const newNotifications = await Notification.find({
      user: userId,
      createdAt: { $gt: since }
    }).sort({ createdAt: -1 });
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false
    });
    
    return NextResponse.json({
      success: true,
      notifications: newNotifications,
      unreadCount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error fetching notification updates:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 