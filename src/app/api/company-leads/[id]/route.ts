import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import CompanyLead from "@/models/companyLead";
import { getDataFromToken } from "@/utils/get_token_data";

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

    await connectToDatabase();

    const lead = await CompanyLead.findById(params.id)
      .populate("assignedTo", "firstName lastName email");

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

    await connectToDatabase();

    const body = await request.json();
    const {
      status,
      assignedTo,
      nextFollowUp,
      followUpNotes,
      notes,
      conversionValue,
      ...otherFields
    } = body;

    const updateData: any = { ...otherFields };

    // Handle status change
    if (status) {
      updateData.status = status;
    }

    // Handle assignment
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null;
      updateData.assignedAt = assignedTo ? new Date() : null;
    }

    // Handle follow-up
    if (nextFollowUp) {
      updateData.nextFollowUp = new Date(nextFollowUp);
    }

    if (followUpNotes !== undefined) {
      updateData.followUpNotes = followUpNotes;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (conversionValue !== undefined) {
      updateData.conversionValue = Number(conversionValue) || 0;
    }

    const lead = await CompanyLead.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("assignedTo", "firstName lastName email");

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead });

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
