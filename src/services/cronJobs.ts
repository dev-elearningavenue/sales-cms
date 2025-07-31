import cron from "node-cron";
import { updateInvoiceStatus } from "../lib/invoiceCronUtils";
import connectDB from "../lib/db";
import axios from "axios";

// Function to hit RAC API
async function syncRacData() {
  try {
    console.log("🔄 Starting RAC data sync...");
    
    // Use environment-based URL (with fallback)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://presale.oshanewsletter.com'
        : 'http://localhost:3000');
    
    const apiUrl = `${baseUrl}/api/rac`;
    console.log(`📡 Hitting API: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'RAC-Cron-Job',
        'Content-Type': 'application/json'
      }
    });
    
    const result = response.data;
    console.log("✅ RAC sync completed:", result.message, `(${result.totalInserted} total new records)`);
    
    // Log individual website results
    if (result.results && Array.isArray(result.results)) {
      result.results.forEach((websiteResult: any) => {
        console.log(`  📊 ${websiteResult.website}: ${websiteResult.inserted} carts`);
      });
    }
  } catch (error: any) {
    console.error("❌ RAC sync failed:", error.message || error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

(async () => {
  await connectDB();

  // Invoice status updater - runs every minute
  cron.schedule("* * * * *", async () => {
    console.log("Running invoice status updater cron job...");
    await updateInvoiceStatus();
  });
  
  // RAC data sync - runs every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("🚀 Running RAC data sync cron job...");
    await syncRacData();
  });
  
  console.log("📅 Cron jobs started:");
  // console.log("  - Invoice status updater: Every minute");
  // console.log("  - RAC data sync: Every 15 minutes");
})();
