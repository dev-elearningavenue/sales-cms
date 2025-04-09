import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/notification";
import { getDataFromToken } from "@/utils/get_token_data";
import mongoose from "mongoose";

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
    
    // Build query - filter by to_users containing the current user
    let query: any = { to_users: userId };
    
    if (unreadOnly) {
      // For unread notifications, check that the user's ID is not in read_by array
      query.read_by = { $ne: userId };
    }
    
    if (after) {
      query.createdAt = { $lt: new Date(after) };
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("lead", "category domain status")
      .populate("from_user", "full_name user_name");
      
    // Transform notifications to include a 'read' boolean for the current user
    const transformedNotifications = notifications.map(notification => {
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
    
    // Get unread count - count notifications where user's ID is in to_users but not in read_by
    const unreadCount = await Notification.countDocuments({ 
      to_users: userId, 
      read_by: { $ne: userId } 
    });
    
    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (markAll) {
      // Mark all notifications as read using $addToSet to add userId to read_by array
      await Notification.updateMany(
        { 
          to_users: userId,
          read_by: { $ne: userId }
        },
        { 
          $addToSet: { read_by: userObjectId } 
        }
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
      { 
        _id: { $in: notificationIds }, 
        to_users: userId
      },
      { 
        $addToSet: { read_by: userObjectId } 
      }
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
      await Notification.deleteMany({ to_users: userId });
      
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
      to_users: userId
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