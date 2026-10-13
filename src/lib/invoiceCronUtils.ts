import Invoice from "@/models/invoice";
import type { IInvoice as InvoiceType } from "@/models/invoice";
import { createInvoicePaymentNotification } from "@/services/notificationService";
import { MongoClient, ObjectId } from "mongodb";
import { LEGACY_SITE_DATABASE_CONFIG } from "@/controllers/customerController";
import connectDB from "@/lib/db";

const BASE_API = "https://freeoshacourses.com/api/fetch_invoice_status.php";

const LEGACY_CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
};

/** Safe parse: external API may return HTML on error; avoid JSON parse crash */
async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface InvoiceStatusResult {
  status: string;
  paidAt: Date | null;
  paymentResult: Record<string, unknown> | null;
}

const FETCH_TIMEOUT_MS = 15000;
const SYNC_CONCURRENCY = 10;

let invoiceStatusSyncRunning = false;

export function isInvoiceStatusSyncRunning() {
  return invoiceStatusSyncRunning;
}

/** Kick off sync in the background so HTTP callers do not hit gateway timeouts. */
export function startInvoiceStatusSync() {
  if (invoiceStatusSyncRunning) {
    return { started: false as const, alreadyRunning: true as const };
  }

  invoiceStatusSyncRunning = true;
  updateInvoiceStatus()
    .catch((error) => {
      console.error("Background invoice status sync failed:", error);
    })
    .finally(() => {
      invoiceStatusSyncRunning = false;
    });

  return { started: true as const, alreadyRunning: false as const };
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  const runners = Array.from({ length: size }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

const fetchInvoiceStatus = async (
  invoice: InvoiceType
): Promise<InvoiceStatusResult> => {
  try {
    const params = new URLSearchParams({
      customer_id: invoice.customerId || "",
      invoice_number: invoice.invoiceNumber,
      site_name: invoice.siteName,
    });
    const url = `${BASE_API}?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const data = await safeParseJson(res);
    if (data?.status && data?.data && typeof data.data === "object") {
      const d = data.data as Record<string, unknown>;
      if (d.status) {
        return {
          status: String(d.status),
          paidAt: (d.paidAt as Date) ?? null,
          paymentResult: (d.paymentResult as Record<string, unknown>) ?? null,
        };
      }
    }
    return { status: "unpaid", paidAt: null, paymentResult: null };
  } catch (error: unknown) {
    console.error(
      "Error fetching invoice status:",
      invoice.invoiceNumber,
      error instanceof Error ? error.message : error,
    );
    return { status: "unpaid", paidAt: null, paymentResult: null };
  }
};

/**
 * After invoice is marked paid: update order + user in the legacy site DB.
 * 1. orders collection  → isPaid, paymentResult, transaction_id
 * 2. users  collection  → push courses based on userType (2 → courses, 4 → purchasedCourses)
 */
async function handleInvoicePaidProcessing(
  inv: InvoiceType,
  paymentResult: Record<string, unknown> | null
): Promise<void> {
  const siteConfig =
    LEGACY_SITE_DATABASE_CONFIG[
      inv.siteName as keyof typeof LEGACY_SITE_DATABASE_CONFIG
    ];

    if (!siteConfig) {
      console.error(`[post-paid] No legacy config for site: ${inv.siteName}`);
      return;
    }

  const client = new MongoClient(siteConfig.uri, LEGACY_CONNECTION_OPTIONS);

  try {
    await client.connect();
    const db = client.db(siteConfig.dbName);

    // ── 1. Update order
    const ordersCol = db.collection("orders");
    const order = await ordersCol.findOne({ invoice_number: inv.invoiceNumber });

    if (!order) {
      console.warn(`[post-paid] No order found for invoice_number: ${inv.invoiceNumber}`);
    } else {
      await ordersCol.updateOne(
        { _id: order._id },
        {
          $set: {
            isPaid: true,
            paymentResult: paymentResult ?? {},
            transaction_id: (paymentResult as any)?.id ?? null,
          },
        }
      );
      console.log(`[post-paid] Order updated for invoice: ${inv.invoiceNumber}`);
    }

    // ── 2. Update user – add courses ─────────────────────────────────
    const usersCol = db.collection(siteConfig.collection);
    const user = await usersCol.findOne({ email: inv.email.toLowerCase() });
    

    if (!user) {
      console.warn(`[post-paid] User not found for email: ${inv.email}`);
      return;
    }

    const orderItems: any[] = order?.items ?? [];

    if (user.userType === 2) {
      const now = new Date();
      const existingPurchased = (user.purchased_courses ?? []) as any[];

      const toPush: any[] = [];
      for (const item of orderItems) {
        const rawCourseId = item.course_id?.$oid ?? item.course_id;
        const courseId = rawCourseId ? new ObjectId(rawCourseId) : null;
        const itemQty = typeof item.quantity === "number" ? item.quantity : 1;
        console.log("courseId: ", courseId);
        console.log("itemQty: ", itemQty);
        if (!courseId) {
          toPush.push({
            assignCount: 0,
            _id: new ObjectId(),
            courseId: null,
            quantity: itemQty,
            createdAt: now,
            updatedAt: now,
          });
          continue;
        }
        const existing = existingPurchased.find(
          (pc: any) =>
            pc.courseId &&
            (pc.courseId.toString?.() ?? String(pc.courseId)) === courseId.toString()
        );
        if (existing) {
          console.log("existing: ", existing);
          await usersCol.updateOne(
            { _id: user._id, "purchased_courses.courseId": courseId },
            {
              $inc: { "purchased_courses.$.quantity": itemQty },
              $set: { "purchased_courses.$.updatedAt": now },
            }
          );
        } else {
          console.log("else: ", itemQty);
          toPush.push({
            assignCount: 0,
            _id: new ObjectId(),
            courseId,
            quantity: itemQty,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      console.log("toPush: ", toPush);
      if (toPush.length > 0) {
        await usersCol.updateOne(
          { _id: user._id },
          { $push: { purchased_courses: { $each: toPush } } as any }
        );
      }
    } else if (user.userType === 4) {
      const now = new Date();
      const coursesToAdd = orderItems.map((item: any) => {
        return {
          status: "0",
          completion: "UNKNOWN",
          score: "0",
          time: "00:00:00",
          course_assign_status: true,
          completedDate: "",
          expiryDate: "",
          firstAccessDate: "",
          lastAccessDate: "",
          scorm_registered: false,
          is_failed: false,
          _id: new ObjectId(),
          deleted: false,
          courseId: new ObjectId(item.course_id.toString()),
          createdAt: now,
          updatedAt: now,
        };
      });
      await usersCol.updateOne(
        { _id: user._id },
        { $push: { courses: { $each: coursesToAdd } } as any }
      );
    }

    console.log(
      `[post-paid] User courses updated for: ${inv.email}, userType: ${user.userType}`
    );
  } catch (error) {
    console.error(
      `[post-paid] Error processing paid invoice ${inv.invoiceNumber}:`,
      error
    );
  } finally {
    await client.close();
  }
}

export const updateInvoiceStatus = async () => {
  try {
    await connectDB();
    console.log(
      "Fetching all unpaid invoices to update status...",
      new Date().toLocaleString("en-US"),
    );

    const invoices = await Invoice.find({ status: "unpaid", deletedAt: null });
    console.log(
      `Invoice status sync: ${invoices.length} unpaid invoices, concurrency=${SYNC_CONCURRENCY}`,
    );

    let checked = 0;
    let markedPaid = 0;

    await runPool(invoices, SYNC_CONCURRENCY, async (inv) => {
      const { status, paidAt, paymentResult } = await fetchInvoiceStatus(inv);
      checked += 1;

      // Strict: only mark paid when local is unpaid AND payment API returns paid
      if (inv.status === "unpaid" && status === "paid") {
        console.log(
          `Updating invoice ${inv.invoiceNumber} status from ${inv.status} to ${status}`,
        );
        inv.status = status;
        inv.paidAt = paidAt;
        await inv.save();
        markedPaid += 1;

        try {
          await createInvoicePaymentNotification(inv);
        } catch (error) {
          console.error(
            `Error creating notification for invoice ${inv.invoiceNumber}:`,
            error,
          );
        }

        try {
          console.log("calling handleInvoicePaidProcessing");
          await handleInvoicePaidProcessing(inv, paymentResult);
        } catch (error) {
          console.error(
            `[post-paid] Failed for invoice ${inv.invoiceNumber}:`,
            error,
          );
        }

        console.log(
          "Invoice status synced successfully",
          inv.invoiceNumber,
          new Date().toLocaleString("en-US"),
        );
      }

      if (checked % 50 === 0 || checked === invoices.length) {
        console.log(
          `Invoice status sync progress: ${checked}/${invoices.length}, markedPaid=${markedPaid}`,
        );
      }
    });

    console.log(
      `Invoice status sync finished: checked=${checked}, markedPaid=${markedPaid}`,
      new Date().toLocaleString("en-US"),
    );
  } catch (error) {
    console.error("Error updating invoice statuses:", error);
  }
};

/**
 * Triggers your own `GET /api/rac` (which pulls from WordPress + inserts carts).
 * If this axios call is commented out, only this cron path stops — anything that still
 * requests `/api/rac` directly (host crontab, curl, etc.) will still run `app/api/rac/route.ts`.
 * To fully pause abandoned-cart sync: set DISABLE_RAC_SYNC=true on the server (see that route).
 */
export const syncRacData = async () => {
  try {
    if (process.env.DISABLE_RAC_SYNC === "true") {
      console.log(
        "[syncRacData] Skipped — DISABLE_RAC_SYNC=true",
        new Date().toLocaleString("en-US")
      );
      return;
    }

    // Use environment-based URL (with fallback)
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://presale.oshanewsletter.com"
        : "http://localhost:3000");

    const apiUrl = `${baseUrl}/api/rac`;

    // Uncomment to let cron (`/api/cron/rac`, `cronJobs.ts`) trigger the same work as a browser hit to `/api/rac`:
    // const axios = (await import("axios")).default;
    // await axios.get(apiUrl, {
    //   timeout: 30000,
    //   headers: {
    //     "User-Agent": "RAC-Cron-Job",
    //     "Content-Type": "application/json",
    //   },
    // });
    console.log("RAC data synced successfully", new Date().toLocaleString("en-US"));

  } catch (error: any) {
    console.error("❌ RAC sync failed:", error.message || error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
};

/**
 * Polls stickySignUp APIs (OOR/OES/OOC) via GET /api/sticky-signup.
 * Disable with DISABLE_STICKY_SYNC=true.
 */
export const syncStickySignupData = async () => {
  try {
    if (process.env.DISABLE_STICKY_SYNC === "true") {
      console.log(
        "[syncStickySignupData] Skipped — DISABLE_STICKY_SYNC=true",
        new Date().toLocaleString("en-US")
      );
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://presale.oshanewsletter.com"
        : "http://localhost:3000");

    const apiUrl = `${baseUrl}/api/sticky-signup`;
    const axios = (await import("axios")).default;
    const res = await axios.get(apiUrl, {
      timeout: 180000,
      headers: {
        "User-Agent": "StickySignup-Cron-Job",
        "Content-Type": "application/json",
      },
    });

    console.log(
      "Sticky signup synced:",
      res.data?.message || "ok",
      new Date().toLocaleString("en-US")
    );
  } catch (error: any) {
    console.error("❌ Sticky signup sync failed:", error.message || error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
};
