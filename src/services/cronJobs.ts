import cron from "node-cron";
import { updateInvoiceStatus, syncRacData } from "../lib/invoiceCronUtils";
import connectDB from "../lib/db";

(async () => {
  // await connectDB();

  // Invoice status updater - runs every minute
  // cron.schedule("* * * * *", async () => {
  //   console.log("Updating invoice status...", new Date().toLocaleString('en-US'));
  //   await updateInvoiceStatus();
  // });
  
  // RAC data sync - runs every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("Syncing RAC data...", new Date().toLocaleString('en-US'));
    await syncRacData();
  });
  
})();
