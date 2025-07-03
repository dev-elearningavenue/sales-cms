import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createOrder, getAllOrders } from "@/controllers/orderController";

export const dynamic = "force-dynamic";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json();
    console.log("Body Received.", body)

    // Use the order controller to create order and lead
    const result = await createOrder(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
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
