import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import connectToDatabase from "@/lib/db";
import ManagerLead from "@/models/managerLead";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = String(tokenData._id);
    const { searchParams } = new URL(request.url);

    const query: any = {
      assignedTo: userId,
      assigned: true,
    };

    const status = searchParams.get("status");
    if (status) query.status = status;

    const statusCategory = searchParams.get("statusCategory");
    if (statusCategory) query.statusCategory = statusCategory;

    const resolveStatus = searchParams.get("resolveStatus");
    if (resolveStatus) query.resolveStatus = resolveStatus;

    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { companyEmail: { $regex: search, $options: "i" } },
        { contactNo: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      query.assignedAt = {};
      if (dateFrom) query.assignedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.assignedAt.$lte = endDate;
      }
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const leads = await ManagerLead.find(query)
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await ManagerLead.countDocuments(query);

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get my-assigned manager leads error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
