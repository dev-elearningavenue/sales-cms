import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
import { getDataFromToken } from "@/utils/get_token_data";
import { isPreSale } from "@/utils/userTypes";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get timestamp from query params
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get("since");
    
    if (!since) {
      return NextResponse.json(
        { error: "Missing 'since' parameter" },
        { status: 400 }
      );
    }
    
    // Convert string timestamp to Date object
    const sinceDate = new Date(since);

    const filter: Record<string, unknown> = {
      createdAt: { $gt: sinceDate },
    };

    // Pre Sale: only their own created leads
    if (isPreSale(Number(tokenData.user_type))) {
      filter.created_by = tokenData._id.toString();
    }
    
    // Query for leads created after the specified timestamp
    const newLeads = await Lead.find(filter)
    .populate([
      { path: "free_signup", model: "Customer" },
      { path: "contact_us", model: "Contact" },
      { path: "abandoned_cart", model: "AbandonedCart" },
      { path: "scholarship", model: "Scholarship" },
      { path: "order_creation", model: "OrderCreation" },
      { path: "custom_lead", model: "CustomLead" },
      { path: "assigned_to", model: "User", select: "full_name user_name" },
    ])
    .sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      newLeads,
      timestamp: new Date() 
    });
  } catch (error) {
    console.error("Error fetching lead updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead updates" },
      { status: 500 }
    );
  }
}
