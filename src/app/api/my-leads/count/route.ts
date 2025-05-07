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
    if (typeof tokenData !== 'object' || !tokenData._id) {
      return NextResponse.json({ message: "Invalid token data" }, { status: 401 });
    }

    const userId = tokenData._id.toString();
    const searchParams = request.nextUrl.searchParams;
    const resolved = searchParams.get("resolved");

    // Build filter based on query parameters
    const filter: any = {
      assigned: true,
      "assigned_to._id": userId
    };

    // Filter by resolution status
    if (resolved !== null) {
      filter.resolve_status = resolved === "true" ? "Resolved" : { $ne: "Resolved" };
    }

    // Get count of leads matching filter
    const count = await Lead.countDocuments(filter);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching my lead count:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead count" },
      { status: 500 }
    );
  }
} 