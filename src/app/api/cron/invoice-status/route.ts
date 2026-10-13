import { NextResponse } from "next/server";
import { startInvoiceStatusSync } from "@/lib/invoiceCronUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/invoice-status
 * Starts unpaid-invoice paid sync in the background and returns immediately
 * so nginx/gateway does not 504 on large unpaid queues.
 */
export async function GET() {
  try {
    console.log(
      "Syncing invoice status Api was hit...",
      new Date().toLocaleString("en-US"),
    );

    const result = startInvoiceStatusSync();

    return NextResponse.json({
      success: true,
      message: result.alreadyRunning
        ? "Invoice status sync already running"
        : "Invoice status sync started",
      started: result.started,
      already_running: result.alreadyRunning,
    });
  } catch (error: unknown) {
    console.error("Cron invoice-status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
