"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInvoiceStatus = void 0;
const invoice_1 = __importDefault(require("@/models/invoice"));
const notificationService_1 = require("@/services/notificationService");
const fetchInvoiceStatus = async (invoice) => {
    try {
        const params = new URLSearchParams({
            customer_id: invoice.customerId || "",
            invoice_number: invoice.invoiceNumber,
            site_name: invoice.siteName || "OSHA OUTREACH COURSES",
        });
        const url = `https://freeoshacourses.com/api/fetch_invoice_status.php?${params.toString()}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status && data.data && data.data.status) {
            return { status: data.data.status, paidAt: data.data.paidAt };
        }
        return { status: "unpaid", paidAt: null };
    }
    catch (error) {
        console.error("Error fetching invoice status:", error.message);
        return { status: "", paidAt: null };
    }
};
const updateInvoiceStatus = async () => {
    try {
        // Fetch all invoices
        // console.log("Fetching all unpaid invoices to update status...");
        const invoices = await invoice_1.default.find({ status: "unpaid" });
        for (const inv of invoices) {
            const { status, paidAt } = await fetchInvoiceStatus(inv);
            // Update invoice in DB if status has changed
            if (inv.status === "unpaid" && status === "paid") {
                console.log(`Updating invoice ${inv.invoiceNumber} status from ${inv.status} to ${status}`);
                inv.status = status;
                inv.paidAt = paidAt;
                await inv.save();
                // Create notification for invoice payment
                try {
                    await (0, notificationService_1.createInvoicePaymentNotification)(inv);
                    // console.log(
                    //   `Notification created for invoice ${inv.invoiceNumber} for ${inv.totalPrice} payment`
                    // );
                }
                catch (error) {
                    console.error(`Error creating notification for invoice ${inv.invoiceNumber}:`, error);
                }
                // Play notification sound (client-side)
                if (typeof window !== "undefined") {
                    try {
                        const audio = new Audio("/notification.mp3");
                        audio.volume = 0.5;
                        audio.play().catch((err) => {
                            console.log("Audio autoplay was blocked:", err);
                        });
                    }
                    catch (err) {
                        console.error("Error playing notification sound:", err);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error("Error updating invoice statuses:", error);
    }
};
exports.updateInvoiceStatus = updateInvoiceStatus;
