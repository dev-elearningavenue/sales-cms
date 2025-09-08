//app/api/my-leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeadsByUser, updateLeadStatus } from "@/controllers/leadController";
import { getDataFromToken } from "@/utils/get_token_data";
import connectDB from "@/lib/db";
import User from "@/models/user";
import { verifyToken } from "@/utils/auth";
import { assignLeadToUser } from "@/controllers/leadController";

// Connect to database at route initialization
connectDB().catch(console.error);

export async function GET(request: Request) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Type check and extract user ID
    if (typeof tokenData === "object" && tokenData._id) {
      const userId = tokenData._id.toString();
      const myLeads = await getLeadsByUser(userId);
      if (myLeads.error) return NextResponse.json(myLeads, { status: 500 });

      return NextResponse.json(myLeads, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Invalid token data" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/my-leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Assign lead to current user
export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const userId = decoded.data._id;
    // Get user details
    const user = await User.findById(userId).select("full_name user_name");
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    // Use controller to assign lead and create notification
    const result = await assignLeadToUser(leadId, userId, decoded.data.user_type);
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.message === "Lead not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const {
      leadId,
      newStatus,
      conversionValue,
      followUpDate,
      contactTypes,
      followUpNote,
      note,
    } = await req.json();

    if (!leadId || !newStatus) {
      return NextResponse.json(
        { message: "Lead ID and new status are required" },
        { status: 400 }
      );
    }

    // Get user ID for note creation
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = tokenData._id.toString();
    const additionalData: any = {};

    if (conversionValue !== undefined) {
      additionalData.conversionValue = conversionValue;
    }

    // Handle both legacy "Follow Up" and numbered follow-ups (Follow Up 1, 2, 3)
    if (followUpDate && (newStatus === "Follow Up" || newStatus.startsWith("Follow Up "))) {
      additionalData.followUpDate = followUpDate;

      if (
        contactTypes &&
        Array.isArray(contactTypes) &&
        contactTypes.length > 0
      ) {
        additionalData.contactTypes = contactTypes;
      }

      if (followUpNote) {
        additionalData.followUpNote = followUpNote;
      }
    }

    if (note) {
      additionalData.note = note;
      additionalData.userId = userId;
    }

    // Always pass the user ID for notification creation
    additionalData.userId = userId;

    const updatedLead = await updateLeadStatus(
      leadId,
      newStatus,
      additionalData
    );
    
    if (!updatedLead) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }
    
    // Check if there was a validation error
    if (typeof updatedLead === 'object' && 'error' in updatedLead && updatedLead.error === true) {
      return NextResponse.json({ 
        message: updatedLead.message || "Validation error" 
      }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Status updated successfully", updatedLead },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating lead status:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
