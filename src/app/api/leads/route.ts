import { NextResponse } from "next/server";
import { getAllLeads, createLead } from "@/controllers/leadController";
import connectDB from "@/lib/db";
import "@/models/customer";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

// GET method for fetching all leads
export async function GET(req: Request) {
  // Parse query parameters
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const form = url.searchParams.get('form');
  
  try {
    // Get all leads from controller
    const leadsResult = await getAllLeads();
    
    if (leadsResult.error) {
      return NextResponse.json(leadsResult, { status: 500 });
    }
    
    // No filters, return all leads
    if (!type && !form) {
      return NextResponse.json(leadsResult, { status: 200 });
    }
    
    // Apply filtering if parameters are provided
    let filteredLeads = leadsResult.leads;
    
    // Filter by category/type if specified
    if (type) {
      const typeMap: {[key: string]: string} = {
        'contact_us': 'Contact Us',
        'free_signup': 'Free SignUp',
        'abandoned_cart': 'Abandoned Cart',
        'order_creation': 'Order Creation',
        'scholarship': 'Scholarship'
      };
      
      const category = typeMap[type] || type;
      filteredLeads = filteredLeads.filter((lead: any) => lead.category === category);
    }
    
    // Additional filtering can be applied here
    // For example, filtering contact_us leads with form=2
    
    return NextResponse.json({
      ...leadsResult,
      leads: filteredLeads
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Failed to fetch leads", 
      message: error.message 
    }, { status: 500 });
  }
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
