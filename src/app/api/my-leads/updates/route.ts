import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
import { getDataFromToken } from "@/utils/get_token_data";

export const dynamic = "force-dynamic";
// Connect to database at route initialization
connectDB().catch(console.error);

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Type check and extract user ID
    if (typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { message: "Invalid token data" },
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
    const userId = tokenData._id.toString();

    // Query for new leads assigned to this user after the specified timestamp
    // This includes both newly created and newly assigned existing leads
    const newLeads = await Lead.find({
      assigned: true,
      "assigned_to._id": userId,
      $or: [
        // New leads that were created after the timestamp
        { createdAt: { $gt: sinceDate } },
        // Existing leads that were assigned to this user after the timestamp
        { assignedAt: { $gt: sinceDate } },
      ],
    })
    .populate([
      { path: "free_signup", model: "Customer" },
      { path: "contact_us", model: "Contact" },
      { path: "abandoned_cart", model: "AbandonedCart" },
      { path: "scholarship", model: "Scholarship" },
      { path: "order_creation", model: "OrderCreation" },
      { path: "custom_lead", model: "CustomLead" },
      { path: "shortcourse_discount", model: "ShortCourseDiscount" },
      { path: "assigned_to", model: "User", select: "full_name user_name" },
    ])
    .sort({ createdAt: -1 });

    return NextResponse.json({
      newLeads,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching my lead updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch my lead updates" },
      { status: 500 }
    );
  }
}
