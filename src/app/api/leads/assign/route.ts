// src/app/api/leads/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/user";
import { verifyToken } from "@/utils/auth";
import { assignLeadToUser } from "@/controllers/leadController";

export async function POST(req: NextRequest) {
  // await dbConnect();
  try {
    const { leadId, userId: targetUserId } = await req.json();
    // console.log("Assign Lead API")
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const userId = decoded.data._id;
    const currentUserType = decoded.data.user_type;
    
    // Determine if assignment is to another user or self
    const assignToUserId = targetUserId || userId;
    
    // If assigning to another user, verify permissions
    if (targetUserId && targetUserId !== userId) {
      // Only user types 1 and 2 can assign to other users
      if (currentUserType === 3) {
        return NextResponse.json({ 
          error: "You don't have permission to assign leads to other users" 
        }, { 
          status: 403 
        });
      }
      
      // Get target user to verify their type
      const targetUser = await User.findById(targetUserId).select('user_type full_name user_name');
      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }
      
      // Type 1 can assign to types 2 and 3, Type 2 can only assign to type 3
      if (currentUserType === 2 && targetUser.user_type && targetUser.user_type !== 3) {
        return NextResponse.json({ 
          error: "You can only assign leads to type 3 users" 
        }, { 
          status: 403 
        });
      }
      
      if (targetUser.user_type && targetUser.user_type <= currentUserType) {
        return NextResponse.json({ 
          error: "You can only assign leads to users with higher type numbers" 
        }, { 
          status: 403 
        });
      }
    }
    
    // Get user details of the target user (who will be assigned the lead)
    const assignedUser = await User.findById(assignToUserId).select('full_name user_name');
    if (!assignedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Use the controller to assign lead and create notification
    const result = await assignLeadToUser(leadId, assignToUserId);
    
    if (!result.success) {
      // Special handling for already assigned leads
      if (result.isAlreadyAssigned) {
        return NextResponse.json({ 
          success: false,
          error: result.message 
        }, { 
          status: 409
        });
      }
      
      return NextResponse.json({ 
        error: result.message 
      }, { 
        status: result.message === "Lead not found" ? 404 : 500 
      });
    }

    // Return success with user details
    return NextResponse.json({ 
      success: true,
      message: result.message,
      assignedTo: {
        _id: assignedUser._id,
        full_name: assignedUser.full_name,
        user_name: assignedUser.user_name
      }
    });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 });
  }
}