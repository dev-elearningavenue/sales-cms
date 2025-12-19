import { NextRequest, NextResponse } from "next/server";
import {
  createInvoice,
  CreateInvoiceRequest,
  getAllInvoices,
  getInvoicesByAgent,
  deleteInvoice,
  markInvoiceAsPaid,
} from "@/controllers/invoiceController";
import { verifyToken } from "@/utils/auth";
import { cookies } from "next/headers";
import { TokenPayload } from "@/types/auth";
import { getDataFromToken } from "@/utils/get_token_data";

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
      send_email: "yes",
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

    // Parse query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50", 10);
    const agentName = url.searchParams.get("agentName") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const date = url.searchParams.get("date") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const result = await getAllInvoices({
      page,
      pageSize,
      agentName,
      status,
      date,
      search,
    });

    return NextResponse.json({ 
      success: true, 
      invoices: result.invoices,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
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

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = tokenData._id.toString();
    const userType =
      typeof tokenData.user_type === "number" ? tokenData.user_type : 3;


    // Get invoice ID from query parameters
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("id");

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Delete the invoice
    const result = await deleteInvoice(invoiceId, userId, userType);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in invoice deletion API:", error);
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

// PATCH - Mark invoice as paid
export async function PATCH(request: NextRequest) {
  try {
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
    const userId = userData._id;
    const userType = userData.user_type;

    // Get invoice ID from request body
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Mark invoice as paid
    const result = await markInvoiceAsPaid(invoiceId, userId, userType);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error marking invoice as paid:", error);
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
