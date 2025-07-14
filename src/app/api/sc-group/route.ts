import { NextRequest, NextResponse } from "next/server";
import { creatediscountQuery } from "@/controllers/scDiscountController";

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json();

    const result = await creatediscountQuery(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in SC Group Discount API:", error);

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
