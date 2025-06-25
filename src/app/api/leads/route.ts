import { NextResponse } from "next/server";
import {
  getAllLeads,
  createLead,
  deleteLead,
} from "@/controllers/leadController";
import connectDB from "@/lib/db";
import "@/models/customer";
import { getDataFromToken } from "@/utils/get_token_data";
import Lead from "@/models/lead";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

// GET method for fetching all leads
export async function GET(req: Request) {
  // Parse query parameters
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const form = url.searchParams.get("form");
  const limit = url.searchParams.get("limit");
  const latest = url.searchParams.get("latest");
  const skip = url.searchParams.get("skip");

  try {
    // Prepare options for the controller
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      latest: latest === "true",
    };

    // Get leads from controller with pagination options
    const leadsResult = await getAllLeads(options);

    if (leadsResult.error) {
      return NextResponse.json(leadsResult, { status: 500 });
    }

    let filteredLeads = leadsResult.leads;
    
    // Filter by category/type if specified (this filtering happens after DB query)
    if (type) {
      const typeMap: { [key: string]: string } = {
        contact_us: "Contact Us",
        free_signup: "Free SignUp",
        abandoned_cart: "Abandoned Cart",
        order_creation: "Order Creation",
        scholarship: "Scholarship",
      };

      const category = typeMap[type] || type;
      filteredLeads = filteredLeads.filter(
        (lead: any) => lead.category === category
      );
    }

    // Get total count for hasMore calculation (we need to make another query for accurate count)
    const totalCount = await getTotalLeadsCount(type);
    
    const response = {
      ...leadsResult,
      leads: filteredLeads,
      total: totalCount,
      hasMore: limit && skip ? totalCount > (parseInt(skip, 10) + parseInt(limit, 10)) : false,
      showing: filteredLeads.length,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch leads",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to get total count
async function getTotalLeadsCount(type?: string | null): Promise<number> {
  try {
    await connectDatabase();
    
    let countQuery = {};
    
    if (type) {
      const typeMap: { [key: string]: string } = {
        contact_us: "Contact Us",
        free_signup: "Free SignUp",
        abandoned_cart: "Abandoned Cart",
        order_creation: "Order Creation",
        scholarship: "Scholarship",
      };

      const category = typeMap[type] || type;
      countQuery = { category };
    }
    
    const count = await Lead.countDocuments(countQuery);
    return count;
  } catch (error) {
    console.error("Error getting total leads count:", error);
    return 0;
  }
}

export async function POST(req: Request) {
  const ids = [""];

  const body = await req.json(); // You will need to extract the JSON body from the request
  const newLead = await createLead(ids, body);

  if (newLead.error) {
    return NextResponse.json(newLead, { status: 500 });
  }
  return NextResponse.json(newLead, { status: 201 });
}

export async function DELETE(req: Request) {
  try {
    // Get the lead ID from query parameters
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json(
        { message: "Lead ID is required" },
        { status: 400 }
      );
    }

    // Get user data and check authorization
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = tokenData._id.toString();
    const userType =
      typeof tokenData.user_type === "number" ? tokenData.user_type : 3;

    // Use the controller function to handle deletion
    const result = await deleteLead(leadId, userId, userType);

    if (!result.success) {
      const statusCode =
        result.message === "Lead not found"
          ? 404
          : result.message === "You don't have permission to delete leads"
          ? 403
          : 500;

      return NextResponse.json(
        { message: result.message },
        { status: statusCode }
      );
    }

    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
