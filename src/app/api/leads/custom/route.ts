import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Lead from "@/models/lead";
import CustomLead from "@/models/customLead";
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
    const { firstName, lastName, email, contactNo, domain, supportType, coursesInterested } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !contactNo || !domain || !supportType || !coursesInterested) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Create CustomLead document
    const customLead = new CustomLead({
      firstName,
      lastName,
      email,
      contactNo,
      domain,
      supportType,
      coursesInterested,
    });

    await customLead.save();

    // Create Lead document with reference to CustomLead
    const lead = new Lead({
      category: "Custom Lead",
      custom_lead: customLead._id,
      status: "Follow Up",
      assigned: true, // Auto-assign to creator
      assigned_to: tokenData._id,
      created_by: tokenData._id,
      domain,
    });

    await lead.save();

    return NextResponse.json(
      { 
        message: "Custom lead created successfully", 
        lead: {
          ...lead.toObject(),
          custom_lead: customLead.toObject()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating custom lead:", error);
    return NextResponse.json(
      { message: "Failed to create custom lead" },
      { status: 500 }
    );
  }
} 