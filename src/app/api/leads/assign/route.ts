// src/app/api/leads/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/user";
import { verifyToken } from "@/utils/auth";
import { assignLeadToUser } from "@/controllers/leadController";

export async function POST(req: NextRequest) {
  // await dbConnect();
  try {
    const { leadId } = await req.json();
    // console.log("Assign Lead API")
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const userId = decoded.data._id;
    
    // Get user details
    const user = await User.findById(userId).select('full_name user_name');
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Use the controller to assign lead and create notification
    const result = await assignLeadToUser(leadId, userId);
    
    if (!result.success) {
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
        _id: user._id,
        full_name: user.full_name,
        user_name: user.user_name
      }
    });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 });
  }
}