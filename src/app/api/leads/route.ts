import { NextResponse } from "next/server";
import {
  getAllLeads,
  createLead,
  createBulkLeads,
  deleteLead,
  batchDeleteLeads,
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

    // Get all leads from controller
    const leadsResult = await getAllLeads();
    
    if (leadsResult.error) {
      return NextResponse.json(leadsResult, { status: 500 });
    }

    if (!type && !form) {
      return NextResponse.json(leadsResult, { status: 200 });
    }
    console.log("Lead Count: ",leadsResult.leads.length)

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
      hasMore:
        limit && skip
          ? totalCount > parseInt(skip, 10) + parseInt(limit, 10)
          : false,
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
  const body = await req.json();

  // If category is 'Invoice' and invoice is present, only set required fields and reference invoice
  if (body.category === "Invoice" && body.invoice) {
    const leadData = {
      category: "Invoice",
      invoice: body.invoice,
      status: "Pending",
      resolve_status: "Pending",
      assigned: body.assigned || false,
      assigned_to: body.assigned_to || null,
      created_by: body.created_by || null,
      domain: body.domain,
      conversion_value: body.conversion_value || null,
    };
    const newLead = await createLead(leadData);
    if (!newLead.success) {
      return NextResponse.json(newLead, { status: 500 });
    }
    return NextResponse.json(newLead, { status: 201 });
  }

  // Otherwise, pass all fields as before
  const newLead = await createLead(body);
  if (!newLead.success) {
    return NextResponse.json(newLead, { status: 500 });
  }
  return NextResponse.json(newLead, { status: 201 });
}

export async function DELETE(req: Request) {
  try {
    // Get parameters from query or body
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");
    
    // Check if it's a batch delete request
    const isBatch = url.searchParams.get("batch") === "true";
    
    if (!leadId && !isBatch) {
      return NextResponse.json(
        { message: "Lead ID is required" },
        { status: 400 }
      );
    }

    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = tokenData._id.toString();
    const userType =
      typeof tokenData.user_type === "number" ? tokenData.user_type : 3;

    // Handle batch delete
    if (isBatch) {
      const body = await req.json();
      const leadIds = body.leadIds;
      
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json(
          { message: "Lead IDs array is required for batch delete" },
          { status: 400 }
        );
      }

      const result = await batchDeleteLeads(leadIds, userId, userType);

      if (!result.success) {
        const statusCode =
          result.message === "No leads found"
            ? 404
            : result.message === "You don't have permission to delete leads"
            ? 403
            : 500;

        return NextResponse.json(
          { message: result.message },
          { status: statusCode }
        );
      }

      return NextResponse.json({ 
        message: result.message,
        deletedCount: result.deletedCount 
      }, { status: 200 });
    }

    // Handle single delete
    if (leadId) {
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
    }

    return NextResponse.json(
      { message: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting lead(s):", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
