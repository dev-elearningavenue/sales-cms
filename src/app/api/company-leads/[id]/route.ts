import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import CompanyLead from "@/models/companyLead";
import { getDataFromToken } from "@/utils/get_token_data";
import { updateCompanyLead } from "@/controllers/companyLeadController";
export const dynamic = 'force-dynamic';

// GET single company lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const lead = await CompanyLead.findById(params.id)
      .populate("assignedTo", "firstName lastName email")
      .populate("emails");

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead });

  } catch (error) {
    console.error("Get company lead error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update company lead
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
  
    const body = await request.json();
    const userId = tokenData._id.toString();

    // console.log("Body Json: ", body);

    // Use controller method instead of direct mongoose
    const result = await updateCompanyLead(params.id, body, userId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error("Update company lead error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE company lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const lead = await CompanyLead.findByIdAndDelete(params.id);

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Lead deleted successfully" });

  } catch (error) {
    console.error("Delete company lead error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
