import AbandonedCart from "@/models/abandonedCart";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createRac } from "@/controllers/racController";

// Helper to get latest order_id and createdAt from local DB
async function getLatestCartInfo() {
  const latestCart = await AbandonedCart.findOne({domain: "Free Osha Courses - FOC"}, { order_id: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();
  return latestCart || {};
}

// Helper to check if order_id exists
async function orderIdExists(order_id: string) {
  return !!(await AbandonedCart.findOne({ domain: "Free Osha Courses - FOC", order_id }));
}

export async function GET(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  try {
    // Connect to database
    await connectDB();
    // 1. Get latest order_id and createdAt from local DB
    const latestCartInfo = await getLatestCartInfo();
    console.log("latestCartInfo: ", latestCartInfo);
    // const latestCartInfo = {order_id: "1754"};
    const lastorderid = (latestCartInfo as any)?.order_id ?? undefined;
    const lastdate = (latestCartInfo as any)?.createdAt ?? undefined;

    // 2. Build external API URL
    const params = [];
    if (lastorderid) params.push(`lastorderid=${encodeURIComponent(lastorderid)}`);
    if (lastdate) params.push(`lastdate=${encodeURIComponent(lastdate?.toISOString?.() || lastdate)}`);
    const url = `https://freeoshacourses.com/api/rac.php${params.length ? "?" + params.join("&") : ""}`;
    console.log("URL: ", url);

    // 3. Fetch from external API
    const extRes = await axios.get(url, { timeout: 20000 });
    const rac_data = extRes.data?.rac_data || [];
    // console.log("rac_data: ", rac_data);

    if (!Array.isArray(rac_data) || rac_data.length === 0) {
      return NextResponse.json(
        { success: true, message: "No new carts.", inserted: 0 }, 
        { status: 200, headers: corsHeaders });
    }

    // 4. Deduplicate and insert only new carts
    let inserted = 0;
    for (const cart of rac_data) {
      if (!cart.order_id) continue;
      if (await orderIdExists(cart.order_id)) continue;
      // console.log("cart: ", cart);
      try {
        const racData = transformRac(cart);
        await createRac(racData);
        inserted++;
      } catch (e) {
        // Log and skip
        console.error("Failed to insert cart", cart.order_id, e);
      }
    }
    return NextResponse.json({ success: true, message: `Inserted ${inserted} new carts.`, inserted }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in RAC GET:", error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500, headers: corsHeaders });
  }
}

function transformRac(rac_data: any) {

  // Validate required fields
  if (!rac_data) {
    throw new Error("Missing rac_data in WordPress request");
  }

  if (!rac_data.email) {
    throw new Error("Missing customer email in rac_data");
  }

  const domainPrefixMap: Record<string, string> = {
    "Osha 360 - Osha360": "360",
    "Free Osha Courses - FOC": "FOC",
    "Osha 30 Construction - 30Construction": "30Construction",
    "EHS School - EHSS": "EHSS",
    "NY Osha 30 - NY30": "NY30",
    "EHS Practice - EHSP": "EHSP",
    "Osha Practice - OP": "OP",
  };

  const orderPrefix = domainPrefixMap[rac_data.domain];

  const transformedData = {
    isPaid: rac_data.isPaid || false,
    firstName: rac_data.firstName?.trim() || "",
    lastName: rac_data.lastName?.trim() || "",
    email: rac_data.email?.trim()?.toLowerCase() || "",
    contactNo: rac_data.contactNo?.trim() || "",
    address: rac_data.address?.trim() || "",
    state: rac_data.state?.trim() || "",
    zipCode: rac_data.zipCode?.trim() || "",
    city: rac_data.city?.trim() || "",
    country: rac_data.country?.trim() || "",
    items: rac_data.items || [],
    domain: rac_data.domain || "",
    total: rac_data.total || 0,
    order_id: `${orderPrefix}-${rac_data.order_id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return transformedData;
}