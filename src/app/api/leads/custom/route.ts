import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createCustomLead } from "@/controllers/leadController";
import { getDataFromToken } from "@/utils/get_token_data";

// Connect to database
connectDB().catch(console.error);

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

    console.log("Custom Lead Data:", customLeadData);
    // Use the controller function to create the custom lead
    const result = await createCustomLead(customLeadData, createdById);

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
    console.error("Error creating custom lead:", error);
    return NextResponse.json(
      { message: "Failed to create custom lead", error: error.message },
      { status: 500 }
    );
  }
}