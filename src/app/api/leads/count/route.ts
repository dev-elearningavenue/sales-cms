import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const assigned = searchParams.get("assigned");
    const resolved = searchParams.get("resolved");
    const userId = searchParams.get("userId");

    // Build filter based on query parameters
    const filter: any = {};

    // Filter by assignment status
    if (assigned !== null) {
      filter.assigned = assigned === "true";
    }

    // Filter by resolution status
    if (resolved !== null) {
      filter.resolve_status =
        resolved === "true" ? "Resolved" : { $ne: "Resolved" };
    }

    // Filter by user assignment
    if (userId) {
      filter["assigned_to._id"] = userId;
    }

    // Get count of leads matching filter
    const count = await Lead.countDocuments(filter);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching lead count:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead count" },
      { status: 500 }
    );
  }
}
