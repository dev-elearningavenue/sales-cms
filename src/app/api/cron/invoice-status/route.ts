import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { updateInvoiceStatus } from "@/lib/invoiceCronUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/invoice-status
 */
export async function GET(request: NextRequest) {
  
  try {

    console.log("Syncing invoice status Api was hit...", new Date().toLocaleString('en-US'));
    await updateInvoiceStatus();

    return NextResponse.json({ success: true, message: "Invoice status sync completed" });
    
  } catch (error: unknown) {
    console.error("Cron invoice-status error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
