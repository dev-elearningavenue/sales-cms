import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/notification";
import { getDataFromToken } from "@/utils/get_token_data";

// Connect to database
connectDB();

// GET notifications for the current user
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
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const after = searchParams.get("after"); // For pagination
    
    // Build query
    let query: any = { user: userId };
    
    if (unreadOnly) {
      query.read = false;
    }
    
    if (after) {
      query.createdAt = { $lt: new Date(after) };
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
      
    // Get unread count
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH to mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const { notificationIds, markAll } = await req.json();
    
    // Get user ID from token
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();
    
    if (markAll) {
      // Mark all notifications as read
      await Notification.updateMany(
        { user: userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read"
      });
    }
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { message: "Notification IDs are required" },
        { status: 400 }
      );
    }
    
    // Mark specific notifications as read
    await Notification.updateMany(
      { _id: { $in: notificationIds }, user: userId },
      { $set: { read: true, readAt: new Date() } }
    );
    
    return NextResponse.json({
      success: true,
      message: "Notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE to delete notifications
export async function DELETE(req: NextRequest) {
  try {
    const { notificationIds, deleteAll } = await req.json();
    
    // Get user ID from token
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();
    
    if (deleteAll) {
      // Delete all notifications
      await Notification.deleteMany({ user: userId });
      
      return NextResponse.json({
        success: true,
        message: "All notifications deleted"
      });
    }
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { message: "Notification IDs are required" },
        { status: 400 }
      );
    }
    
    // Delete specific notifications
    await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: userId
    });
    
    return NextResponse.json({
      success: true,
      message: "Notifications deleted"
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 