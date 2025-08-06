export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import Invoice from "@/models/invoice";
import User from "@/models/user";

export async function GET(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin (user_type 1 or 2)
    if (tokenData.user_type !== 1 && tokenData.user_type !== 2) {
      return NextResponse.json(
        { message: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // MongoDB months are 1-indexed
    const currentYear = currentDate.getFullYear();

    // Aggregate pipeline to get agents sales data
    const agentsSales = await Invoice.aggregate([
      {
        $match: {
          status: 'paid'
        }
      },
      {
        $addFields: {
          paidMonth: { $month: "$paidAt" },
          paidYear: { $year: "$paidAt" },
        }
      },
      {
        $group: {
          _id: "$agentId",
          totalSales: { $sum: "$totalPrice" },
          thisMonthSales: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paidMonth", currentMonth] },
                    { $eq: ["$paidYear", currentYear] }
                  ]
                },
                "$totalPrice",
                0
              ]
            }
          },
          totalInvoices: { $sum: 1 },
          paidInvoices: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "agent"
        }
      },
      {
        $unwind: "$agent"
      },
      {
        $project: {
          agentId: "$_id",
          agentName: { $ifNull: ["$agent.full_name", "$agent.user_name"] },
          totalSales: 1,
          thisMonthSales: 1,
          totalInvoices: 1,
          paidInvoices: 1
        }
      },
      {
        $sort: { updatedAt: -1 }
      }
    ]);

    return NextResponse.json({
      success: true,
      agentsSales
    });

  } catch (error) {
    console.error("Error fetching agents sales:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 