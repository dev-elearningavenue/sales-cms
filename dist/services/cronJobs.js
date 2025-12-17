"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const invoiceCronUtils_1 = require("../lib/invoiceCronUtils");
const db_1 = __importDefault(require("../lib/db"));
const axios_1 = __importDefault(require("axios"));
// Function to hit RAC API
async function syncRacData() {
    try {
        // Use environment-based URL (with fallback)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
            (process.env.NODE_ENV === 'production'
                ? `${process.env.PRODUCTION_URL}`
                : `${process.env.LOCAL_URL}`);
        const apiUrl = `${baseUrl}/api/rac`;
        console.log(`📡 Hitting API: ${apiUrl}`,new Date().toLocaleString('en-US'));
        const response = await axios_1.default.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'RAC-Cron-Job',
                'Content-Type': 'application/json'
            }
        });
        const result = response.data;
    }
    catch (error) {
        console.error("❌ RAC sync failed:", error.message || error);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}
(async () => {
    await (0, db_1.default)();
    // Invoice status updater - runs every minute
    node_cron_1.default.schedule("* * * * *", async () => {
        await (0, invoiceCronUtils_1.updateInvoiceStatus)();
    });
    // RAC data sync - runs every 15 minutes
    node_cron_1.default.schedule("*/15 * * * *", async () => {
        await syncRacData();
    });
    console.log("📅 Cron jobs started:");
    // console.log("  - Invoice status updater: Every minute");
    // console.log("  - RAC data sync: Every 15 minutes");
})();
