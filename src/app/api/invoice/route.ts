import { NextRequest, NextResponse } from "next/server";
import {
  createInvoice,
  CreateInvoiceRequest,
  getAllInvoices,
  getInvoicesByAgent,
} from "@/controllers/invoiceController";
import { verifyToken } from "@/utils/auth";
import { cookies } from "next/headers";
import { TokenPayload } from "@/types/auth";

export const dynamic = "force-dynamic";

// Function to call external invoice processing API
const processExternalInvoice = async (invoiceData: any) => {
  try {
    const response = await fetch(
      "https://freeoshacourses.com/api/api_process_invoice.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      }
    );

    const result = await response.json();

    if (response.ok && result.status) {
      return { success: true, data: result };
    } else {
      console.error("External invoice API error:", result);
      return {
        success: false,
        error: result.error || "External API call failed",
      };
    }
  } catch (error) {
    console.error("Error calling external invoice API:", error);
    return { success: false, error: "External API call failed" };
  }
};

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tokenResult = await verifyToken(token.value);
    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Type assertion for token data
    const userData = tokenResult.data as unknown as TokenPayload;

    const body = await request.json();
    const invoiceData: CreateInvoiceRequest = body;

    // Add agent information from token
    invoiceData.agentId = userData._id;
    invoiceData.agentName = userData.full_name;

    if (!invoiceData.products || invoiceData.products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one product is required",
        },
        { status: 400 }
      );
    }

    // Validate due date
    const dueDate = new Date(invoiceData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return NextResponse.json(
        {
          success: false,
          error: "Due date cannot be in the past",
        },
        { status: 400 }
      );
    }

    // Get site code from site name (helper function)
    const getSiteCode = (siteName: string) => {
      const siteMap: { [key: string]: string } = {
        "OSHA OUTREACH COURSES": "001",
        "OSHA ONLINE CENTER": "002",
        "OSHA EDUCATION SCHOOL": "003",
        "OSHA PRO": "004",
      };
      return siteMap[siteName] || "001";
    };

    // Prepare data for external API call
    const externalInvoiceData = {
      site_name: getSiteCode(invoiceData.siteName),
      send_email: "yes", // Always send email as per your requirement
      product_ids: invoiceData.products.map((product) => product.product_id),
      price_ids: invoiceData.products.map((product) => product.price_id),
      quantities: invoiceData.products.map((product) => product.quantity),
      due_date: invoiceData.dueDate,
      coupon_id: invoiceData.coupon || "",
      agent_name: userData.full_name,
      customer_id: invoiceData.customerId,
    };

    // Create the invoice on stripe first
    const externalResult = await processExternalInvoice(externalInvoiceData);
    // console.log("Stripe invoice result: ", externalResult)
    if (externalResult.success) {
      if (externalResult.success && externalResult.data.data?.hostedUrl) {
        // console.log("here...")
        invoiceData.hostedUrl = externalResult.data.data.hostedUrl;
        invoiceData.invoiceNumber = externalResult.data.data.invoiceNumber;
      }
      // If stripe database creation was successful, call local API
      const result = await createInvoice(invoiceData);
      let percent_off = invoiceData.percent_off || "";
      return NextResponse.json(
        {
          ...result,
          externalApiSuccess: !!externalResult.success,
          externalData: externalResult.data,
          percent_off,
          externalError: externalResult.error,
          warning: !externalResult.success
            ? "Invoice created locally but external processing failed"
            : undefined,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(externalResult, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in invoice creation API:", error);

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

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tokenResult = await verifyToken(token.value);
    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const userData = tokenResult.data as unknown as TokenPayload;
    const invoices = await getAllInvoices();

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error("Error in invoice API:", error);
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
