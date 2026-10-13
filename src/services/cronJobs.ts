import cron from "node-cron";
import {
  startInvoiceStatusSync,
  syncRacData,
  syncStickySignupData,
} from "../lib/invoiceCronUtils";

(async () => {
  // Invoice status updater - every hour, background (no gateway wait)
  cron.schedule("0 * * * *", () => {
    console.log(
      "Updating invoice status...",
      new Date().toLocaleString("en-US"),
    );
    const result = startInvoiceStatusSync();
    console.log(
      result.alreadyRunning
        ? "Invoice status sync already running — skipped"
        : "Invoice status sync started",
    );
  });

  // RAC data sync - runs every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("Syncing RAC data...", new Date().toLocaleString("en-US"));
    await syncRacData();
  });

  // Sticky SignUp sync (OOR/OES/OOC) - every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log(
      "Syncing Sticky SignUp data...",
      new Date().toLocaleString("en-US"),
    );
    await syncStickySignupData();
  });
})();
