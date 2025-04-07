import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
import { verifyToken } from "@/utils/auth";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
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
    
    // Query for leads created after the specified timestamp
    const newLeads = await Lead.find({
      createdAt: { $gt: sinceDate }
    }).sort({ createdAt: -1 });
    
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