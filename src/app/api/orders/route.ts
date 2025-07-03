/**
 * WordPress Data Transformation Example
 * 
 * INPUT (from WordPress):
 * {
 *   user_data: {
 *     user_email: 'support@freeoshacourses.com',
 *     display_name: 'Farhan Siraj'
 *   },
 *   order_data: {
 *     first_name: 'Mustafa',
 *     last_name: 'Ahmed',
 *     company: '',
 *     address_1: 'Gulshan Iqbal',
 *     address_2: '',
 *     city: 'New York City',
 *     state: 'SD',
 *     postcode: '10001',
 *     country: 'PK',
 *     email: 'support@freeoshacourses.com',
 *     phone: '+92 332 8444028',
 *     id: 1551,
 *     items: [ { name: "Test Course", quantity: 1, price: 100 } ],
 *     type: 'Yourself',
 *     domain: 'oshapractice.com'
 *   }
 * }
 * 
 * OUTPUT (for our system):
 * {
 *   domain: 'OOC',                    // Mapped from oshapractice.com
 *   firstName: 'Mustafa',
 *   lastName: 'Ahmed',
 *   email: 'support@freeoshacourses.com',
 *   phone: '+92 332 8444028',
 *   company: '',
 *   address_1: 'Gulshan Iqbal',
 *   address_2: '',
 *   city: 'New York City',
 *   state: 'SD',
 *   postcode: '10001',
 *   country: 'PK',
 *   wordpress_order_id: 1551,
 *   order_type: 'Yourself',
 *   items: [ { name: "Test Course", quantity: 1, price: 100 } ],
 *   processed_by: {
 *     email: 'support@freeoshacourses.com',
 *     name: 'Farhan Siraj'
 *   },
 *   source_domain: 'oshapractice.com',
 *   source: 'wordpress',
 *   created_at: '2024-01-15T10:30:00.000Z',
 *   original_data: { ... }             // Stores original for reference
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createOrder, getAllOrders } from "@/controllers/orderController";

export const dynamic = "force-dynamic";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

// Function to transform WordPress data to our system format
function transformWordPressData(wordpressData: any) {
  const { user_data, order_data } = wordpressData;
  
  // Validate required fields
  if (!order_data) {
    throw new Error("Missing order_data in WordPress request");
  }
  
  if (!order_data.domain) {
    throw new Error("Missing domain in order_data");
  }
  
  if (!order_data.first_name || !order_data.last_name) {
    throw new Error("Missing customer name in order_data");
  }
  
  if (!order_data.email) {
    throw new Error("Missing customer email in order_data");
  }

  // Transform the data structure
  const transformedData = {
    firstName: order_data.first_name?.trim(),
    lastName: order_data.last_name?.trim(),
    email: order_data.email?.trim()?.toLowerCase(),
    contactNo: order_data.phone?.trim() || '',
    
    // Address information
    company: order_data.company?.trim(),
    address: order_data.address_1?.trim() + " " + order_data.address_2?.trim(),
    city: order_data.city?.trim(),
    state: order_data.state?.trim(),
    postcode: order_data.postcode?.trim(),
    country: order_data.country?.trim(),
    items: order_data.items || [],
    
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return transformedData;
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json();

    console.log(JSON.stringify(body.order_data.items, null, 2));
    console.dir(body.orderitems, { depth: null, colors: true });

    // Check if this is WordPress data (has user_data and order_data structure)
    const isWordPressData = body.order_data;
    
    let orderData;
    if (isWordPressData) {
      orderData = transformWordPressData(body);
      console.log("Transformed data:", orderData);
    } else {
      orderData = body;
    }

    // Use the order controller to create order and lead
    const result = await createOrder(orderData);

    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in orders API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");
    const domain = searchParams.get("domain");

    // Prepare options for the controller
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      domain: domain || undefined,
    };

    // Use the order controller to get orders
    const result = await getAllOrders(options);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching orders:", error);

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
