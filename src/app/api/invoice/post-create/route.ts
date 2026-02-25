import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import {
  fetchStatusUpdateItems,
  createOrderViaAPI,
  updateLocalInvoiceAfterOrder,
} from "@/lib/invoicePostCreate";
export const dynamic = "force-dynamic";

/**
 * POST /api/invoice/post-create
 * Expects body: invoiceNumber, site_name, email, firstName?, lastName?
 */
export async function POST(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      invoiceNumber,
      siteName,
      userId,
      email,
      firstName,
      lastName,
      contactNo,
      address,
      city,
      state,
      country,
      zipCode,
    } = body;

    if (!invoiceNumber || !siteName || !userId) {
      return NextResponse.json(
        { success: false, error: "invoiceNumber, siteName and userId are required" },
        { status: 400 }
      );
    }

    const steps: { step: string; success: boolean; message?: string }[] = [];

    const statusResult = await fetchStatusUpdateItems(invoiceNumber, siteName);

    if (!statusResult.success || !statusResult.items?.length) {
      steps.push({
        step: "fetch_items",
        success: false,
        message: statusResult.error || "No items returned",
      });
      return NextResponse.json({
        success: false,
        steps,
        error: "Could not fetch invoice items for order",
      });
    }

    steps.push({ step: "fetch_items", success: true, message: "Items fetched" });

    // console.log("User Id", userId);
    // console.log("Invoice Number", invoiceNumber);

    const orderResult = await createOrderViaAPI(
      statusResult.items,
      userId,
      invoiceNumber,
      siteName,
      email,
      firstName != null || lastName != null ? { firstName, lastName } : undefined,
      { contactNo, address, city, state, country, zipCode }
    );
    console.log("Order Result: ", orderResult);

    steps.push({
      step: "order",
      success: orderResult.success,
      message: orderResult.success ? "Order created" : orderResult.error,
    });

    if (orderResult.success) {
      const updateResult = await updateLocalInvoiceAfterOrder(
        invoiceNumber,
        orderResult.orderId,
        orderResult.user ?? userId
      );
      steps.push({
        step: "update_invoice",
        success: updateResult.success,
        message: updateResult.success ? "Invoice updated with orderId & user" : updateResult.error,
      });
    }

    const allOk = steps.every((s) => s.success);
    return NextResponse.json(
      {
        success: allOk,
        steps,
        message: allOk ? "Order setup complete" : "Some steps failed",
      },
      { status: allOk ? 201 : 400 }
    );
  } catch (error: any) {
    console.error("Error in invoice post-create:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
