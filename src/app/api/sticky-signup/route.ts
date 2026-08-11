import StickySignup from "@/models/stickySignup";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { createStickySignup } from "@/controllers/stickySignupController";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const WEBSITES = [
  {
    name: "Osha Outreach",
    domain: "Osha Outreach - OOR",
    apiUrl: "https://api.oshaoutreachcourses.com/get-stickySignUp",
    code: "OOR",
  },
  {
    name: "Osha Education School",
    domain: "Osha Education School - OES",
    apiUrl: "https://api.oshaeducationschool.com/get-stickySignUp",
    code: "OES",
  },
  {
    name: "Osha Online Center",
    domain: "Osha Online Center - OOC",
    apiUrl: "https://api.oshaonlinecenter.com/get-stickySignUp",
    code: "OOC",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function originExists(originId: string, domain: string) {
  return !!(await StickySignup.findOne({ originId, domain }).lean());
}

/**
 * Only sync sticky signups created on/after this cutoff.
 * Default: start of today (UTC) — never import historical backlog.
 * Override with STICKY_SYNC_FROM=YYYY-MM-DD (or ISO datetime).
 */
function getSyncCutoff(): Date {
  if (process.env.STICKY_SYNC_FROM) {
    const parsed = new Date(process.env.STICKY_SYNC_FROM);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  return cutoff;
}

function getRowCreatedAt(row: any): Date | null {
  if (!row?.createdAt) return null;
  const d = new Date(row.createdAt);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Polls stickySignUp APIs for OOR / OES / OOC and creates inbound leads.
 * Only rows with createdAt >= today (or STICKY_SYNC_FROM) are imported.
 * Set DISABLE_STICKY_SYNC=true to turn off.
 */
export async function GET(req: NextRequest) {
  if (process.env.DISABLE_STICKY_SYNC === "true") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sticky signup sync disabled (DISABLE_STICKY_SYNC=true).",
      },
      { status: 503, headers: corsHeaders }
    );
  }

  try {
    await connectDB();

    const syncCutoff = getSyncCutoff();
    let totalInserted = 0;
    const results = [];

    for (let i = 0; i < WEBSITES.length; i++) {
      const website = WEBSITES[i];

      try {
        const extRes = await axios.get(website.apiUrl, { timeout: 60000 });
        const rows = Array.isArray(extRes.data)
          ? extRes.data
          : extRes.data?.data || extRes.data?.stickySignUps || [];

        if (!Array.isArray(rows) || rows.length === 0) {
          results.push({
            website: website.name,
            fetched: 0,
            eligible: 0,
            inserted: 0,
            message: "No sticky signups returned",
          });
          continue;
        }

        // Drop historical rows before any DB lookups
        const eligibleRows = rows.filter((row: any) => {
          const createdAt = getRowCreatedAt(row);
          return createdAt !== null && createdAt >= syncCutoff;
        });

        let inserted = 0;
        let skipped = 0;

        for (const row of eligibleRows) {
          const originId = row?._id ? String(row._id) : "";
          if (!originId || !row?.email) {
            skipped++;
            continue;
          }

          if (await originExists(originId, website.domain)) {
            skipped++;
            continue;
          }

          const result = await createStickySignup({
            originId,
            email: row.email,
            phone: row.phone || "",
            OSHA_10: row.OSHA_10 || "",
            OSHA_30: row.OSHA_30 || "",
            promoUrl: row.promoUrl || "",
            domain: website.domain,
            sourceCreatedAt: row.createdAt,
            sourceUpdatedAt: row.updatedAt,
          });

          if (result.success) {
            inserted++;
          } else if (result.skipped) {
            skipped++;
          }
        }

        totalInserted += inserted;
        results.push({
          website: website.name,
          fetched: rows.length,
          eligible: eligibleRows.length,
          inserted,
          skipped,
          message: `Inserted ${inserted} (eligible since ${syncCutoff.toISOString()}; skipped ${rows.length - eligibleRows.length} old)`,
        });

        console.log(
          `✅ Sticky ${website.name}: ${inserted} inserted / ${eligibleRows.length} eligible / ${rows.length} fetched (cutoff ${syncCutoff.toISOString()}) at`,
          new Date().toLocaleString("en-US")
        );
      } catch (error: any) {
        console.error(`❌ Sticky sync error ${website.name}:`, error.message);
        results.push({
          website: website.name,
          fetched: 0,
          eligible: 0,
          inserted: 0,
          message: `Error: ${error.message}`,
        });
      }

      if (i < WEBSITES.length - 1) {
        await sleep(1000);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${WEBSITES.length} websites. Total inserted: ${totalInserted}. Cutoff: ${syncCutoff.toISOString()}`,
        syncCutoff: syncCutoff.toISOString(),
        totalInserted,
        results,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error in sticky-signup GET:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
