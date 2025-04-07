//app/api/my-leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeadsByUser, updateLeadStatus } from "@/controllers/leadController";
import { getDataFromToken } from "@/utils/get_token_data";
import connectDB from "@/lib/db";
import { verifyToken } from "@/utils/auth";
import Lead from "@/models/lead";
import User from "@/models/user";

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

    // Update the lead with assignment info and timestamp
    await Lead.findByIdAndUpdate(leadId, {
      assigned_to: user._id,
      assigned: true,
      assignedAt: new Date(), // Add timestamp for when the lead was assigned
    });

    return NextResponse.json({ success: true });
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
      note 
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
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();

    // Build additional data object based on provided values
    const additionalData: any = {};
    
    if (conversionValue !== undefined) {
      additionalData.conversionValue = conversionValue;
    }
    
    if (followUpDate) {
      additionalData.followUpDate = new Date(followUpDate);
      
      if (contactTypes && Array.isArray(contactTypes) && contactTypes.length > 0) {
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

    const updatedLead = await updateLeadStatus(leadId, newStatus, additionalData);
    if (!updatedLead) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
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