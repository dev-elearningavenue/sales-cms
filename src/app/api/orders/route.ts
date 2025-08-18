import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createOrder, getAllOrders } from "@/controllers/orderController";
export const dynamic = "force-dynamic";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

// Function to transform WordPress data to our system format
function transformWordPressData(wordpressData: any) {
  const { order_data } = wordpressData;

  // Validate required fields
  if (!order_data) {
    throw new Error("Missing order_data in WordPress request");
  }

  if (!order_data.domain) {
    throw new Error("Missing domain in order_data");
  }

  if (!order_data.first_name || !order_data.last_name) {
    throw new Error("Missing customer name in order_data");
  }

  if (!order_data.email) {
    throw new Error("Missing customer email in order_data");
  }

  const domainPrefixMap: Record<string, string> = {
    "Osha 360 - Osha360": "Osha360",
    "Free Osha Courses - FOC": "FOC",
    "Osha 30 Construction - 30Construction": "30Construction",
    "EHS School - EHSS": "EHSS",
    "NY Osha 30 - NY30": "NY30",
    "EHS Practice - EHSP": "EHSP",
    "Osha Practice - OP": "OP",
  };

  const orderPrefix = domainPrefixMap[order_data.domain];

  // Transform the data structure
  const transformedData = {
    firstName: order_data.first_name?.trim(),
    lastName: order_data.last_name?.trim(),
    email: order_data.email?.trim()?.toLowerCase(),
    contactNo: order_data.phone?.trim() || "",

    // Address information
    company: order_data.company?.trim(),
    address: order_data.address_1?.trim() + " " + order_data.address_2?.trim(),
    city: order_data.city?.trim(),
    state: order_data.state?.trim(),
    zipCode: order_data.postcode?.trim(),
    country: order_data.country?.trim(),
    items: order_data.items || [],
    domain: order_data.domain,
    total_order_price: order_data.total_order_price || 0,
    order_id: `${orderPrefix}-${order_data.id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return transformedData;
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json();
    const isWordPressData = body.order_data;

    if (isWordPressData && body.order_data.items) {
      console.log(JSON.stringify(body.order_data.items, null, 2));
    }

    let orderData;
    if (isWordPressData) {
      orderData = transformWordPressData(body);
      // console.log("Transformed data: ", orderData);
    } else {
      orderData = body;
    }

    const result = await createOrder(orderData);

    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in orders API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");
    const domain = searchParams.get("domain");

    // Prepare options for the controller
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      domain: domain || undefined,
    };

    // Use the order controller to get orders
    const result = await getAllOrders(options);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching orders:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
