// app/api/cron-job/route.ts

import "@/services/cronJobs";

export async function GET() {
  return new Response("Cron Jobs initialized\n");
}