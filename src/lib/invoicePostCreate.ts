import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Invoice from "@/models/invoice";
import { SITE_DATABASE_CONFIG } from "@/controllers/customerController";
/**
 * Post-invoice creation: fetch invoice items from status_update API and create order via shop/orders.
 * Used in background after invoice is created so UI does not block.
 */

const EXTERNAL_BASE_URL = "https://freeoshacourses.com";

/** Safe parse: if response is HTML (e.g. 404 page), avoid JSON.parse and return null */
async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}


export function getSiteCode(siteName: string): string {
  const siteMap: { [key: string]: string } = {
    "OSHA OUTREACH COURSES": "001",
    "OSHA ONLINE CENTER": "002",
    "OSHA EDUCATION SCHOOL": "003",
    "OSHA PRO": "004",
  };
  return siteMap[siteName] || "001";
}

export interface StatusUpdateItem {
  portal_type?: number;
  _id?: { $oid: string };
  course_id?: { $oid: string };
  title?: string;
  sku?: string;
  actual_price?: number;
  quantity?: number;
  discount?: number;
  category?: string;
  price?: number;
}

export interface StatusUpdateResponse {
  paymentResult?: unknown;
  items?: StatusUpdateItem[];
  total?: number;
}

export async function fetchStatusUpdateItems(
  invoiceNumber: string,
  siteCode: string
): Promise<{ success: boolean; items?: StatusUpdateItem[]; total?: number; error?: string }> {
  try {
    const url = `${EXTERNAL_BASE_URL}/api/check_payment/status_update.php?invoice_number=${encodeURIComponent(invoiceNumber)}&site_name=${encodeURIComponent(siteCode)}`;
    const response = await fetch(url);
    const data = (await safeParseJson(response)) as StatusUpdateResponse | null;

    // console.log("Data from payment status api: ", data);
    if (!response.ok || data == null) {
      return { success: false, error: data == null ? "Invalid response (not JSON)" : "Failed to fetch invoice items" };
    }

    const items = data.items ?? [];
    return {
      success: true,
      items,
      total: data.total,
    };
  } catch (error: any) {
    console.error("Error fetching status_update items:", error);
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

/** Address/contact fields to send with order */
export interface OrderAddressFields {
  contactNo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

/** Result from order API – may include orderId / id and user */
export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  user?: string;
  error?: string;
}

/** Build order payload from status_update items (with name/title etc) and POST to shop/orders */
export async function createOrderViaAPI(
  items: StatusUpdateItem[],
  user: string,
  invoiceNumber: string,
  siteCode: string,
  customerEmail: string,
  customerName?: { firstName?: string; lastName?: string },
  addressFields?: OrderAddressFields
): Promise<CreateOrderResult> {

  try {
    const orderPayload = {
      user,
      email: customerEmail,
      ...(customerName && {
        firstName: customerName.firstName,
        lastName: customerName.lastName,
      }),
      ...(addressFields && {
        contactNo: addressFields.contactNo ?? "",
        address: addressFields.address ?? "",
        city: addressFields.city ?? "",
        state: addressFields.state ?? "",
        country: addressFields.country ?? "",
        zipCode: addressFields.zipCode ?? "",
      }),
      items: items.map((item) => ({
        course_id: item.course_id?.["$oid"] ?? item._id?.["$oid"],
        title: item.title,
        name: item.title,
        sku: item.sku,
        quantity: item.quantity ?? 1,
        price: item.price ?? item.actual_price,
        discount: item.discount ?? 0,
        category: item.category,
      })),
      invoice_number: invoiceNumber,
      channel: "Invoice",
    };

    const baseUrl = SITE_DATABASE_CONFIG[siteCode as keyof typeof SITE_DATABASE_CONFIG]?.baseUrl;
    // console.log("Base URL: ", baseUrl);
    // console.log("Order Payload: ", orderPayload);

    const response = await fetch(`${baseUrl}/shop/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    type OrderApiResponse = {
      success?: boolean;
      status?: boolean;
      newOrder?: { order_id?: string; [key: string]: unknown };
      message?: string;
      error?: string;
    };
    const result = (await safeParseJson(response)) as OrderApiResponse | null;

    if (result && (result.success === true || response.status === 201)) {
      const orderId = result.newOrder?.order_id;
      return { success: true, orderId, user };
    }
    return {
      success: false,
      error: result?.message || result?.error || "Order creation failed",
    };
  } catch (error: any) {
    console.error("Error creating order via shop/orders:", error);
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

/**
 * Update local invoice by invoiceNumber with orderId and user (after order creation success).
 */
export async function updateLocalInvoiceAfterOrder(
  invoiceNumber: string,
  orderId: string | undefined,
  user: mongoose.Types.ObjectId | string | undefined
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();


    const update: Record<string, unknown> = {};
    if (orderId != null && orderId !== "") update.orderId = orderId;
    if (user != null && user !== null) {
        // const idStr = typeof user === "string" ? user : String(user);
        update.user = new mongoose.Types.ObjectId(user);
    }

    if (Object.keys(update).length === 0) {
      return { success: true };
    }

    const doc = await Invoice.findOneAndUpdate(
      { invoiceNumber, deletedAt: null },
      { $set: update },
      // { new: true }
    );

    if (!doc) {
      return { success: false, error: "Invoice not found for invoiceNumber: " + invoiceNumber };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating local invoice after order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

