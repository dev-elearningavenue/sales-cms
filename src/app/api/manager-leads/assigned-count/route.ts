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

    const totalAssigned = await ManagerLead.countDocuments({
      assignedTo: userId,
      assigned: true,
    });

    const now = new Date();
    const americanTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const startOfTodayAmerican = new Date(
      americanTime.getFullYear(),
      americanTime.getMonth(),
      americanTime.getDate()
    );
    const startOfWeek = new Date(americanTime);
    startOfWeek.setDate(americanTime.getDate() - 7);
    const startOfMonth = new Date(americanTime.getFullYear(), americanTime.getMonth(), 1);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      ManagerLead.countDocuments({ assignedTo: userId, assigned: true, assignedAt: { $gte: startOfTodayAmerican } }),
      ManagerLead.countDocuments({ assignedTo: userId, assigned: true, assignedAt: { $gte: startOfWeek } }),
      ManagerLead.countDocuments({ assignedTo: userId, assigned: true, assignedAt: { $gte: startOfMonth } }),
    ]);

    let domainCounts: Record<string, number> = {};
    if (tokenData.assignedDomain) {
      domainCounts = {
        [tokenData.assignedDomain as string]: await ManagerLead.countDocuments({
          assignedTo: userId,
          assigned: true,
          domain: tokenData.assignedDomain,
        }),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        total: totalAssigned,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        byDomain: domainCounts,
        quota: {
          daily: 30,
          current: todayCount,
        },
      },
    });
  } catch (error) {
    console.error("Get manager-lead assigned count error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
