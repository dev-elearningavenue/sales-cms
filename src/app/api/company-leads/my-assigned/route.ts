import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import connectToDatabase from "@/lib/db";
import CompanyLead from "@/models/companyLead";

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = String(tokenData._id);
    const { searchParams } = new URL(request.url);
    
    // Build query filters
    const query: any = {
      assignedTo: userId,
      assigned: true
    };

    // Status filter
    const status = searchParams.get("status");
    if (status) {
      query.status = status;
    }

    // Search filter (company name, email)
    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { companyEmail: { $regex: search, $options: "i" } }
      ];
    }

    // Date range filter
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      query.assignedAt = {};
      if (dateFrom) {
        query.assignedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.assignedAt.$lte = endDate;
      }
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch leads with sorting (most recent first)
    const leads = await CompanyLead.find(query)
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await CompanyLead.countDocuments(query);

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error("Get assigned leads error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
