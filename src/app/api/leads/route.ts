import { NextResponse } from "next/server";
import { getAllLeads, createLead } from "@/controllers/leadController";
import connectDB from "@/lib/db";
import "@/models/customer";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

// GET method for fetching all leads
export async function GET() {
  // console.log("GET All Leads Api");
  const leads = await getAllLeads();
  if (leads.error) return NextResponse.json(leads, { status: 500 });

  return NextResponse.json(leads, { status: 200 });
}

export async function POST(req: Request) {
  const ids = [''];

  const body = await req.json(); // You will need to extract the JSON body from the request
  const newLead = await createLead(ids, body);

  if (newLead.error) {
    return NextResponse.json(newLead, { status: 500 });
  }
  return NextResponse.json(newLead, { status: 201 });
}
