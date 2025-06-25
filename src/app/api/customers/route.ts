import { NextRequest, NextResponse } from "next/server";
import {
  checkCustomerExists,
  createCustomer,
  CreateCustomerRequest,
} from "@/controllers/customerController";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerData: CreateCustomerRequest = body;

    // console.log("Processing customer with data: ", {
    //   ...customerData,
    //   contactNo: customerData.contactNo ? "***masked***" : "",
    // });

    // Validate required fields
    if (!customerData.site_name || !customerData.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Site name and email are required",
        },
        { status: 400 }
      );
    }
    // Check if this is for existing customer (has fullName but no firstName/lastName)
    const isExistingCustomer =
      customerData.fullName &&
      !customerData.firstName &&
      !customerData.lastName;

    if (isExistingCustomer) {
      const result = await createCustomer(customerData);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } else {
      // For new customer - call create Customer API + DB insertion
      const result = await createCustomer(customerData);
      return NextResponse.json(result, { status: result.success ? 201 : 400 });
    }
  } catch (error: any) {
    console.error("Error in customer API:", error);

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
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const siteName = searchParams.get("siteName");

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }
    let result;
    if (siteName) {
      result = await checkCustomerExists(email, siteName);
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error in customer check API:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        exists: false,
      },
      { status: 500 }
    );
  }
}
