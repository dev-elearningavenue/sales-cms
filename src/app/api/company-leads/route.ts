import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { getDataFromToken } from "@/utils/get_token_data";
import { uploadCSVData, getTimezoneBasedLead } from "@/controllers/companyLeadController";
import CompanyLead from "@/models/companyLead";

// Configure for large file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const state = formData.get("state") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File is required" },
        { status: 400 }
      );
    }

    console.log(`📁 File received: ${file.name}, Size: ${file.size} bytes`);
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 50MB." },
        { status: 413 }
      );
    }

    const userId = String(tokenData._id);
    const userAssignedDomain = (tokenData as any)?.assignedDomain as string | undefined;
    const result = await uploadCSVData(file, state, userId, userAssignedDomain);
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message }, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch timezone-based lead
export async function GET(request: NextRequest) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const result = await getTimezoneBasedLead();
    console.log("Result: ", result);
    if (result.success) {
      // Assign to current user when fetched
      try {
        if ((result as any).lead?._id) {
          await CompanyLead.findByIdAndUpdate((result as any).lead._id, {
            assignedTo: tokenData._id,
            assignedAt: new Date(),
            assigned: true,
            domain: (tokenData as any)?.assignedDomain || "",
          });
        }
      } catch (e) {
        console.error("Assignment on fetch failed:", e);
      }
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }

  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
