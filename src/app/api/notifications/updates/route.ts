import { NextRequest, NextResponse } from "next/server";
import Notification from "@/models/notification";
import { getDataFromToken } from "@/utils/get_token_data";
import mongoose from "mongoose";
export const dynamic = "force-dynamic";

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
    
    // Find new notifications - filtering by to_users containing the current user
    const newNotifications = await Notification.find({
      to_users: userId,
      createdAt: { $gt: since }
    })
    .sort({ createdAt: -1 })
    .populate("lead", "category domain status")
    .populate("from_user", "full_name user_name");
    
    // Transform notifications to include a 'read' boolean for the current user
    const transformedNotifications = newNotifications.map(notification => {
      const notificationObj = notification.toObject();
      // Check if current user is in the read_by array
      const read = notification.read_by.some((id: mongoose.Types.ObjectId | string) => 
        id.toString() === userId
      );
      
      return {
        ...notificationObj,
        read
      };
    });
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      to_users: userId,
      read_by: { $ne: userId }
    });
    
    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
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