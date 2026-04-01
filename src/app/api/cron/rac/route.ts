import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { syncRacData } from "@/lib/invoiceCronUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/rac
 */
export async function GET(request: NextRequest) {
  
  try {
    await connectDB();

    await syncRacData();
    return NextResponse.json({ success: true, message: "RAC data sync completed" });
    
  } catch (error: unknown) {
    console.error("Cron rac error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}