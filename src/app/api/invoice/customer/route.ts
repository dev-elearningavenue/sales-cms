import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/invoice";
import { getDataFromToken } from "@/utils/get_token_data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const emailRaw = (searchParams.get("email") || "").trim();
    const contactNoRaw = (searchParams.get("contact") || "").trim();

    if (!emailRaw && !contactNoRaw) {
      return NextResponse.json(
        { success: false, message: "Email or contact number is required" },
        { status: 400 }
      );
    }

    // Build OR match — capture this person across any invoice that has matching email OR contactNo
    const orClauses: any[] = [];
    if (emailRaw) orClauses.push({ email: { $regex: `^${escapeRegex(emailRaw)}$`, $options: "i" } });
    if (contactNoRaw) orClauses.push({ contactNo: contactNoRaw });

    const query: any = {
      $or: orClauses,
      deletedAt: null,
    };

    // Pull all matching invoices in chronological order (asc) so first/last are easy
    const invoices = await Invoice.find(query)
      .sort({ createdAt: 1 })
      .lean();

    if (invoices.length === 0) {
      return NextResponse.json({
        success: true,
        identity: { email: emailRaw, contactNo: contactNoRaw, fullName: "" },
        stats: emptyStats(),
        invoices: [],
      });
    }

    // Pick the latest non-empty name to display
    const namedInvoice = [...invoices].reverse().find(
      (inv) => (inv.firstName && inv.firstName.trim()) || (inv.lastName && inv.lastName.trim())
    );
    const fullName = namedInvoice
      ? `${namedInvoice.firstName || ""} ${namedInvoice.lastName || ""}`.trim()
      : "";

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const unpaidInvoices = invoices.filter((i) => i.status !== "paid");

    const totalPaidAmount = sum(paidInvoices.map((i) => i.totalPrice || 0));
    const totalUnpaidAmount = sum(unpaidInvoices.map((i) => i.totalPrice || 0));

    const firstInvoice = invoices[0];
    const latestInvoice = invoices[invoices.length - 1];

    let highestPaid: any = null;
    let lowestPaid: any = null;
    if (paidInvoices.length > 0) {
      highestPaid = paidInvoices.reduce((a, b) => ((a.totalPrice || 0) >= (b.totalPrice || 0) ? a : b));
      lowestPaid = paidInvoices.reduce((a, b) => ((a.totalPrice || 0) <= (b.totalPrice || 0) ? a : b));
    }

    // Most-purchased product: aggregate by product name across ALL matching invoices
    const productAgg = await Invoice.aggregate([
      { $match: query },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.name",
          totalQty: { $sum: "$products.quantity" },
          totalSpent: { $sum: "$products.total" },
          appearances: { $sum: 1 },
        },
      },
      { $sort: { totalQty: -1, totalSpent: -1 } },
      { $limit: 5 },
    ]);

    const topProduct = productAgg[0]
      ? {
          name: productAgg[0]._id,
          totalQty: productAgg[0].totalQty,
          totalSpent: productAgg[0].totalSpent,
          appearances: productAgg[0].appearances,
        }
      : null;

    // Agent contribution: how many invoices per agent
    const byAgent: Record<string, { count: number; total: number; paid: number }> = {};
    for (const inv of invoices) {
      const agent = inv.agentName || "Unknown";
      if (!byAgent[agent]) byAgent[agent] = { count: 0, total: 0, paid: 0 };
      byAgent[agent].count += 1;
      byAgent[agent].total += inv.totalPrice || 0;
      if (inv.status === "paid") byAgent[agent].paid += 1;
    }
    const agentBreakdown = Object.entries(byAgent)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      identity: {
        email: firstInvoice.email || emailRaw,
        contactNo: firstInvoice.contactNo || contactNoRaw,
        fullName,
      },
      stats: {
        totalInvoices: invoices.length,
        paidCount: paidInvoices.length,
        unpaidCount: unpaidInvoices.length,
        totalAmount: sum(invoices.map((i) => i.totalPrice || 0)),
        totalPaidAmount,
        totalUnpaidAmount,
        firstInvoice: {
          invoiceNumber: firstInvoice.invoiceNumber,
          createdAt: firstInvoice.createdAt,
          agentName: firstInvoice.agentName,
          totalPrice: firstInvoice.totalPrice,
          status: firstInvoice.status,
        },
        latestInvoice: {
          invoiceNumber: latestInvoice.invoiceNumber,
          createdAt: latestInvoice.createdAt,
          agentName: latestInvoice.agentName,
          totalPrice: latestInvoice.totalPrice,
          status: latestInvoice.status,
        },
        highestPaid: highestPaid
          ? {
              invoiceNumber: highestPaid.invoiceNumber,
              createdAt: highestPaid.createdAt,
              agentName: highestPaid.agentName,
              totalPrice: highestPaid.totalPrice,
            }
          : null,
        lowestPaid: lowestPaid
          ? {
              invoiceNumber: lowestPaid.invoiceNumber,
              createdAt: lowestPaid.createdAt,
              agentName: lowestPaid.agentName,
              totalPrice: lowestPaid.totalPrice,
            }
          : null,
        topProduct,
        topProducts: productAgg.map((p) => ({
          name: p._id,
          totalQty: p.totalQty,
          totalSpent: p.totalSpent,
          appearances: p.appearances,
        })),
        agentBreakdown,
      },
      // Return invoices in newest-first order for the table
      invoices: [...invoices].reverse(),
    });
  } catch (error: any) {
    console.error("Get customer invoice details error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error?.message },
      { status: 500 }
    );
  }
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + (b || 0), 0);
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyStats() {
  return {
    totalInvoices: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalAmount: 0,
    totalPaidAmount: 0,
    totalUnpaidAmount: 0,
    firstInvoice: null,
    latestInvoice: null,
    highestPaid: null,
    lowestPaid: null,
    topProduct: null,
    topProducts: [],
    agentBreakdown: [],
  };
}
