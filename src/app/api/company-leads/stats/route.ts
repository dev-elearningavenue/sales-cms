import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import CompanyLead from "@/models/companyLead";
import { getDataFromToken } from "@/utils/get_token_data";
import { CompanyLeadStats } from "@/types/companyLead";
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    // Build filter
    const filter: any = {};
    if (domain) filter.domain = domain;

    // Get overall stats using new status hierarchy
    const [
      total,
      pendingCount,
      processingCount,
      resolvedCount,
      closedCount,
      followUpCount,
      stateStats,
      domainStats,
      categoryStats
    ] = await Promise.all([
      CompanyLead.countDocuments(filter),
      CompanyLead.countDocuments({ ...filter, status: "pending" }),
      CompanyLead.countDocuments({ ...filter, status: "processing" }),
      CompanyLead.countDocuments({ ...filter, status: "resolved" }),
      CompanyLead.countDocuments({ ...filter, status: "closed" }),
      CompanyLead.countDocuments({ ...filter, status: "follow_up" }),
      CompanyLead.aggregate([
        { $match: filter },
        { $group: { _id: "$state", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      CompanyLead.aggregate([
        { $match: filter },
        { $group: { _id: "$domain", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      CompanyLead.aggregate([
        { $match: filter },
        { $group: { _id: "$statusCategory", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Convert to expected format
    const byState: Record<string, number> = {};
    stateStats.forEach((stat: any) => {
      byState[stat._id] = stat.count;
    });

    const byDomain: Record<string, number> = {};
    domainStats.forEach((stat: any) => {
      byDomain[stat._id] = stat.count;
    });

    const byCategory: Record<string, number> = {};
    categoryStats.forEach((stat: any) => {
      byCategory[stat._id] = stat.count;
    });

    const stats: CompanyLeadStats = {
      total,
      pending: pendingCount,
      processing: processingCount,
      resolved: resolvedCount,
      closed: closedCount,
      followUp: followUpCount,
      byState,
      byDomain,
      byCategory
    };

    return NextResponse.json({ success: true, stats });

  } catch (error) {
    console.error("Get company lead stats error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
