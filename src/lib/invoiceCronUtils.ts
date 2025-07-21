import Invoice from "@/models/invoice";
// If your Invoice model file exports a type, import it like this:
import type { IInvoice as InvoiceType } from "@/models/invoice";
import { createInvoicePaymentNotification } from "@/services/notificationService";

const fetchInvoiceStatus = async (
  invoice: InvoiceType
): Promise<{ status: string; paidAt: Date | null }> => {
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
      console.log(
        `Fetched status for invoice ${invoice.invoiceNumber}: `,
        data.data.status
      );
      return { status: data.data.status, paidAt: data.data.paidAt };
    }
    return { status: "unpaid", paidAt: null };
  } catch (error) {
    console.error("Error fetching invoice status:", error);
    return { status: "", paidAt: null };
  }
};

export const updateInvoiceStatus = async () => {
  try {
    // Fetch all invoices
    console.log("Fetching all unpaid invoices to update status...");
    const invoices = await Invoice.find({ status: "unpaid" });

    for (const inv of invoices) {
      const { status, paidAt } = await fetchInvoiceStatus(inv);
      // Update invoice in DB if status has changed
      if (inv.status === "unpaid" && status === "paid") {
        console.log(
          `Updating invoice ${inv.invoiceNumber} status from ${inv.status} to ${status}`
        );
        inv.status = status;
        inv.paidAt = paidAt;
        await inv.save();

        // Create notification for invoice payment
        try {
          await createInvoicePaymentNotification(inv);
          console.log(
            `Notification created for invoice ${inv.invoiceNumber} for ${inv.totalPrice} payment`
          );
        } catch (error) {
          console.error(
            `Error creating notification for invoice ${inv.invoiceNumber}:`,
            error
          );
        }

        // Play notification sound (client-side)
        if (typeof window !== "undefined") {
          try {
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.5;
            audio.play().catch((err) => {
              console.log("Audio autoplay was blocked:", err);
            });
          } catch (err) {
            console.error("Error playing notification sound:", err);
          }
        } else {
          console.log(
            "Play notification sound for invoice update (client should handle)"
          );
        }
      }
    }
  } catch (error) {
    console.error("Error updating invoice statuses:", error);
  }
};
