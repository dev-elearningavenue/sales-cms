import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
import { verifyToken } from "@/utils/auth";
import { getDataFromToken } from "@/utils/get_token_data";

// Connect to database at route initialization
connectDB().catch(console.error);

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Type check and extract user ID
    if (typeof tokenData !== 'object' || !tokenData._id) {
      return NextResponse.json({ message: "Invalid token data" }, { status: 401 });
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
        { assignedAt: { $gt: sinceDate } }
      ]
    }).sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      newLeads,
      timestamp: new Date() 
    });
  } catch (error) {
    console.error("Error fetching my lead updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch my lead updates" },
      { status: 500 }
    );
  }
} 