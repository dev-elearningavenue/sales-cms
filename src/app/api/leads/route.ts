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
import { isPreSale } from "@/utils/userTypes";
export const dynamic = 'force-dynamic';

// Type mapping constant - used for filtering
const TYPE_MAP: { [key: string]: string } = {
  contact_us: "Contact Us",
  free_signup: "Free SignUp",
  abandoned_cart: "Abandoned Cart",
  order_creation: "Order Creation",
  scholarship: "Scholarship",
  invoice: "Invoice",
  sticky_signup: "Sticky SignUp",
};

// GET method for fetching all leads
export async function GET(req: Request) {
  try {
    // ============ DATABASE CONNECTION ============
    await connectDB();

    // ============ AUTHENTICATION CHECK ============
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      console.log("Unauthorized: ", tokenData);
      return NextResponse.json(
        { error: "Unauthorized", message: "Please login to access leads" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");
    const assignedTo = url.searchParams.get("assignedTo");
    const search = url.searchParams.get("search");
    const domain = url.searchParams.get("domain");
    const status = url.searchParams.get("status");
    const userType = url.searchParams.get("userType");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 50;
    const parsedPage = page ? parseInt(page, 10) : 1;
    const skip = (parsedPage - 1) * parsedPageSize;

    // Filters may arrive as comma-separated lists (multi-select).
    const splitList = (val: string | null) =>
      val
        ? val.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    // Map each selected type (e.g. "order_creation") to its category label.
    const categories = splitList(type).map((t) => TYPE_MAP[t] || t);
    const domains = splitList(domain);
    const statuses = splitList(status);
    const userTypes = splitList(userType);

    // Prepare options for the controller
    const options = {
      limit: parsedPageSize,
      skip: skip,
      latest: true,
      category: categories.length ? categories : undefined,
      assignedTo: assignedTo || undefined,
      search: search || undefined,
      domain: domains.length ? domains : undefined,
      status: statuses.length ? statuses : undefined,
      userType: userTypes.length ? userTypes : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      // Pre Sale (userType 5): only leads they created
      createdBy: isPreSale(Number(tokenData.user_type))
        ? tokenData._id.toString()
        : undefined,
    };

    const leadsResult = await getAllLeads(options);
    
    if (leadsResult.error) {
      return NextResponse.json(leadsResult, { status: 500 });
    }

    // Return full pagination info
    const response = {
      message: leadsResult.message,
      leads: leadsResult.leads,
      total: leadsResult.total,
      showing: leadsResult.showing,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: leadsResult.totalPages,
      hasMore: leadsResult.hasMore,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/leads:", error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch leads",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const body = await req.json();

    // If category is 'Invoice' and invoice is present, only set required fields and reference invoice
    if (body.category === "Invoice" && body.invoice) {
      const leadData = {
        category: "Invoice",
        invoice: body.invoice,
        status: "Pending",
        email: body.email,
        fullname: body.fullname,
        contactNo: body.contactNo,
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
  } catch (error: any) {
    console.error("Error in POST /api/leads:", error.message);
    return NextResponse.json(
      { error: "Failed to create lead", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    
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
