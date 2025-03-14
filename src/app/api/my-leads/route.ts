//app/api/my-leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeadsByUser, updateLeadStatus } from "@/controllers/leadController";
import { getDataFromToken } from "@/utils/get_token_data";
import connectDB from "@/lib/db";
import { verifyToken } from "@/utils/auth";
import Lead from "@/models/lead";

// Connect to database at route initialization
connectDB().catch(console.error);

export async function GET(request: Request) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = tokenData._id;
    const myLeads = await getLeadsByUser(userId as string);
    if (myLeads.error) return NextResponse.json(myLeads, { status: 500 });

    return NextResponse.json(myLeads, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/my-leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Not of any use for now
export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();
    // console.log("Assign Lead API")
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    await Lead.findByIdAndUpdate(leadId, {
      assigned_to: decoded.data._id,
      assigned: true,
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
    const { leadId, newStatus } = await req.json();

    if (!leadId || !newStatus) {
      return NextResponse.json(
        { message: "Lead ID and new status are required" },
        { status: 400 }
      );
    }

    const updatedLead = await updateLeadStatus(leadId, newStatus);
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
