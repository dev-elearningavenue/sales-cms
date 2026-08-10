import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createCustomLead } from "@/controllers/leadController";
import { getDataFromToken } from "@/utils/get_token_data";
import { isPreSale } from "@/utils/userTypes";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get user from token
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const customLeadData = await req.json();

    // Validate required fields
    if (!customLeadData.firstName || !customLeadData.lastName || !customLeadData.email || 
        !customLeadData.contactNo || !customLeadData.domain || !customLeadData.supportType ) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }
    const createdById = tokenData._id ? tokenData._id.toString() : undefined;
    const userType = Number(tokenData.user_type);
    // Use the controller function to create the custom lead
    const result = await createCustomLead(customLeadData, createdById, {
      // Pre Sale: auto-assign created leads to themselves
      autoAssignToCreator: isPreSale(userType),
    });

    if (!result.success) {
      return NextResponse.json(
        { message: result.message, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Custom lead created successfully", 
        lead: result.lead
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating custom lead:", error.message);
    return NextResponse.json(
      { message: "Failed to create custom lead: ", error: error.message },
      { status: 500 }
    );
  }
}
