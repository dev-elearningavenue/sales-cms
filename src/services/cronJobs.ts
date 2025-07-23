import cron from "node-cron";
import { updateInvoiceStatus } from "@/lib/invoiceCronUtils";
import connectDB from "@/lib/db"; // Ensure you have a DB connection utility

(async () => {
  await connectDB();

  cron.schedule("* * * * *", async () => {
    // console.log("Running invoice status updater cron job...");
    await updateInvoiceStatus();
  });
  
})();
