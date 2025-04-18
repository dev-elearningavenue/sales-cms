import { NextRequest, NextResponse } from "next/server";
import Lead from "@/models/lead";
import { verifyToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Get lead IDs from request body
    const { leadIds } = await req.json();
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "Invalid lead IDs" }, { status: 400 });
    }

    // Get assignment status for all leads
    const leads = await Lead.find(
      { _id: { $in: leadIds } }, 
      { _id: 1, assigned: 1, assigned_to: 1 }
    ).populate('assigned_to', 'full_name user_name');

    // Find leads that have been assigned
    const assignedLeads = leads
      .filter(lead => lead.assigned)
      .map(lead => ({
        _id: lead._id,
        assigned: true,
        assigned_to: lead.assigned_to
      }));

    // Determine if there are any updates
    const hasChanges = assignedLeads.length > 0;

    return NextResponse.json({ 
      success: true,
      hasChanges,
      updatedLeads: assignedLeads
    });
  } catch (error) {
    console.error("Error checking assignment status:", error);
    return NextResponse.json({ error: "Failed to check assignment status" }, { status: 500 });
  }
} 