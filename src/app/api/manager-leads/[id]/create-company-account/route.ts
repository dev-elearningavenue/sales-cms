import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import ManagerLead from "@/models/managerLead";
import { getDataFromToken } from "@/utils/get_token_data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUTOMATION_URL = (
  process.env.GEMINI_AUTOMATION_URL || "http://127.0.0.1:4028"
).replace(/\/$/, "");

const MANAGER_ACCOUNT_PASSWORD = "Apple123#";

async function requireUser() {
  const tokenData = await getDataFromToken();
  if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
    return null;
  }
  return tokenData;
}

async function saveManagerAccount(leadId: string, username: string) {
  return ManagerLead.findByIdAndUpdate(
    leadId,
    {
      managerAccountCreated: true,
      managerAccountCreatedAt: new Date(),
      managerAccountUsername: username,
      managerAccountPassword: MANAGER_ACCOUNT_PASSWORD,
    },
    { new: true }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await requireUser();
    if (!tokenData) {
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
          done: true,
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

    const automationRes = await fetch(`${AUTOMATION_URL}/create-company-account-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        firstName,
        lastName,
        email,
        username: email,
      }),
    });
    const data = await automationRes.json().catch(() => ({}));
    if (!automationRes.ok || !data.job_id) {
      return NextResponse.json(
        {
          success: false,
          message: data.error || data.message || "Could not start manager account automation",
        },
        { status: automationRes.status || 502 }
      );
    }

    return NextResponse.json({
      success: true,
      done: false,
      jobId: data.job_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start manager account";
    console.error("Create manager account start error:", message);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await requireUser();
    if (!tokenData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const lead = await ManagerLead.findById(params.id);
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }
    if (lead.managerAccountCreatedAt) {
      return NextResponse.json({ success: true, done: true, status: "done", lead, logs: [] });
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ success: false, message: "jobId is required" }, { status: 400 });
    }

    const automationRes = await fetch(
      `${AUTOMATION_URL}/process-order-status/${encodeURIComponent(jobId)}`
    );
    const job = await automationRes.json().catch(() => ({}));
    if (!automationRes.ok) {
      return NextResponse.json(
        {
          success: false,
          done: true,
          status: "error",
          message: job.error || "Manager account progress is no longer available",
          logs: [],
        },
        { status: automationRes.status || 502 }
      );
    }

    const logs = (Array.isArray(job.logs) ? job.logs : [])
      .map((entry: { line?: string }) => String(entry?.line || "").trim())
      .filter(Boolean);

    if (job.status === "done") {
      const username = String(job.final_payload?.username || lead.companyEmail || "").trim();
      const updatedLead = await saveManagerAccount(String(lead._id), username);
      return NextResponse.json({
        success: true,
        done: true,
        status: "done",
        lead: updatedLead,
        logs,
      });
    }

    if (job.status === "error") {
      return NextResponse.json({
        success: false,
        done: true,
        status: "error",
        message: job.error || "Manager account creation failed",
        logs,
      });
    }

    return NextResponse.json({
      success: true,
      done: false,
      status: job.status || "running",
      logs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read manager account progress";
    console.error("Create manager account status error:", message);
    return NextResponse.json({ success: false, done: true, status: "error", message }, { status: 502 });
  }
}
