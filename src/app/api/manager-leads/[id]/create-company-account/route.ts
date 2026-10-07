import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import ManagerLead from "@/models/managerLead";
import { getDataFromToken } from "@/utils/get_token_data";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AUTOMATION_URL = (
  process.env.GEMINI_AUTOMATION_URL || "http://127.0.0.1:4028"
).replace(/\/$/, "");

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const lead = await ManagerLead.findById(params.id);
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }
    if (lead.managerAccountCreatedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Manager account is already created for this lead.",
          lead,
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const company = String(body.company || lead.companyName || "").trim();
    const firstName = String(body.firstName || lead.firstName || "").trim();
    const lastName = String(body.lastName || lead.lastName || "").trim();
    const email = String(body.email || lead.companyEmail || "").trim();

    if (!company || !firstName || !lastName || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Company, first name, last name, and email are required.",
        },
        { status: 400 }
      );
    }

    const automationRes = await fetch(`${AUTOMATION_URL}/create-company-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        firstName,
        lastName,
        email,
        username: email,
      }),
      signal: AbortSignal.timeout(600000),
    });

    const data = await automationRes.json().catch(() => ({}));
    if (!automationRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.error || data.message || "Company account automation failed",
        },
        { status: automationRes.status || 502 }
      );
    }

    const createdAt = new Date();
    const updatedLead = await ManagerLead.findByIdAndUpdate(
      lead._id,
      {
        managerAccountCreated: true,
        managerAccountCreatedAt: createdAt,
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      ...data,
      managerAccountCreatedAt: createdAt,
      lead: updatedLead,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create company account";
    console.error("Create company account proxy error:", message);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
