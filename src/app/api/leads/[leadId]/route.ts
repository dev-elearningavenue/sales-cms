import { NextRequest, NextResponse } from "next/server";
import Lead from "@/models/lead";
import { verifyToken } from "@/utils/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const leadId = params.leadId;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    // Build the population paths
    const populations = [
      { path: "free_signup", model: "Customer" },
      { path: "contact_us", model: "Contact" },
      { path: "abandoned_cart", model: "AbandonedCart" },
      { path: "scholarship", model: "Scholarship" },
      { 
        path: "order_creation", 
        model: "OrderCreation",
        // populate: {
        //   path: "user",
        //   model: "User",
        //   select: "userName full_name"
        // }
      },
      { path: "custom_lead", model: "CustomLead" },
      { path: "assigned_to", model: "User", select: "full_name user_name" },
      { path: "created_by", model: "User", select: "full_name user_name" }
    ];

    // Find the lead
    const lead = await Lead.findById(leadId).populate(populations);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      lead
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
} 