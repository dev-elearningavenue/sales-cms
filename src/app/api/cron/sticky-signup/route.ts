import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { syncStickySignupData } from "@/lib/invoiceCronUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/sticky-signup
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await syncStickySignupData();
    return NextResponse.json({
      success: true,
      message: "Sticky signup sync completed",
    });
  } catch (error: unknown) {
    console.error("Cron sticky-signup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
