import AbandonedCart from "@/models/abandonedCart";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createRac } from "@/controllers/racController";

// Website configurations
const WEBSITES = [
  {
    name: "Free Osha Courses",
    domain: "Free Osha Courses - FOC",
    apiUrl: "https://freeoshacourses.com/api/rac.php",
    prefix: "FOC"
  },
  {
    name: "Osha Practice",
    domain: "Osha Practice - OP", 
    apiUrl: "https://www.oshapractice.com/api/rac.php",
    prefix: "OP"
  },
  {
    name: "360 Osha 30",
    domain: "Osha 360 - Osha360",
    apiUrl: "https://www.360osha30.com/api/rac.php", 
    prefix: "360"
  },
  {
    name: "EHS School",
    domain: "EHS School - EHSS",
    apiUrl: "https://www.ehsschool.com/api/rac.php",
    prefix: "EHSS"
  },
  {
    name: "NY Osha 30",
    domain: "NY Osha 30 - NY30", 
    apiUrl: "https://www.nyosha30.com/api/rac.php",
    prefix: "NY30"
  },
  {
    name: "EHS Practice",
    domain: "EHS Practice - EHSP",
    apiUrl: "https://www.ehspractice.com/api/rac.php",
    prefix: "EHSP"
  }
];

// Helper to get latest order_id and createdAt from local DB for a specific domain
async function getLatestCartInfo(domain: string) {
  const latestCart = await AbandonedCart.findOne(
    { domain: domain },
    { order_id: 1, createdAt: 1 }
  )
    .sort({ createdAt: -1 })
    .lean();
  return latestCart || {};
}

// Helper to check if order_id exists for a specific domain
async function orderIdExists(order_id: string, domain: string) {
  return !!(await AbandonedCart.findOne({
    domain: domain,
    order_id,
  }));
}

// Helper to sleep for specified milliseconds
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    // Connect to database
    await connectDB();
    
    let totalInserted = 0;
    const results = [];

    // Process each website with 1-second delay
    for (let i = 0; i < WEBSITES.length; i++) {
      const website = WEBSITES[i];
      console.log(`🌐 Processing ${website.name}...`);
      
      try {
        // 1. Get latest order_id and createdAt from local DB for this domain
        const latestCartInfo = await getLatestCartInfo(website.domain);
        console.log(`${website.name} latestCartInfo:`, latestCartInfo);
        
        const lastorderid = (latestCartInfo as any)?.order_id ?? undefined;
        const lastdate = (latestCartInfo as any)?.createdAt ?? undefined;

        // 2. Build external API URL
        const params = [];
        if (lastorderid)
          params.push(`lastorderid=${encodeURIComponent(lastorderid)}`);
        if (lastdate)
          params.push(
            `lastdate=${encodeURIComponent(lastdate?.toISOString?.() || lastdate)}`
          );
        const url = `${website.apiUrl}${
          params.length ? "?" + params.join("&") : ""
        }`;
        console.log(`${website.name} URL:`, url);

        // 3. Fetch from external API
        const extRes = await axios.get(url, { timeout: 20000 });
        const rac_data = extRes.data?.rac_data || [];
        console.log(`${website.name} found ${rac_data.length} carts`);

        if (!Array.isArray(rac_data) || rac_data.length === 0) {
          results.push({
            website: website.name,
            inserted: 0,
            message: "No new carts"
          });
          continue;
        }

        // 4. Deduplicate and insert only new carts for this domain
        let inserted = 0;
        for (const cart of rac_data) {
          if (!cart.order_id) continue;
          if (await orderIdExists(cart.order_id, website.domain)) continue;
          
          try {
            const racData = transformRac(cart, website);
            await createRac(racData);
            inserted++;
          } catch (e) {
            console.error(`Failed to insert cart ${cart.order_id} from ${website.name}:`, e);
          }
        }
        
        totalInserted += inserted;
        results.push({
          website: website.name,
          inserted: inserted,
          message: `Inserted ${inserted} new carts`
        });
        
        console.log(`✅ ${website.name}: ${inserted} carts inserted`);
        
      } catch (error: any) {
        console.error(`❌ Error processing ${website.name}:`, error.message);
        results.push({
          website: website.name,
          inserted: 0,
          message: `Error: ${error.message}`
        });
      }
      
      // Wait 1 second before processing next website (except for the last one)
      if (i < WEBSITES.length - 1) {
        console.log(`⏳ Waiting 1 second before next website...`);
        await sleep(1000);
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Processed ${WEBSITES.length} websites. Total inserted: ${totalInserted} new carts.`, 
        totalInserted,
        results
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error in RAC GET:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

function transformRac(rac_data: any, website: any) {
  // Validate required fields
  if (!rac_data) {
    throw new Error("Missing rac_data in WordPress request");
  }

  if (!rac_data.email) {
    throw new Error("Missing customer email in rac_data");
  }

  const transformedData = {
    isPaid: rac_data.isPaid || false,
    firstName: rac_data.firstName?.trim() || "",
    lastName: rac_data.lastName?.trim() || "",
    email: rac_data.email?.trim()?.toLowerCase() || "",
    contactNo: rac_data.contactNo?.trim() || "",
    address: rac_data.address?.trim() || "",
    state: rac_data.state?.trim() || "",
    zipCode: rac_data.zipCode?.trim() || "",
    city: rac_data.city?.trim() || "",
    country: rac_data.country?.trim() || "",
    items: rac_data.items || [],
    domain: website.domain,
    total: rac_data.total || 0,
    order_id: `${website.prefix}-${rac_data.order_id}`,
    createdAt: rac_data.createdAt ? new Date(rac_data.createdAt) : new Date(),
    updatedAt: new Date(),
  };
  return transformedData;
}
