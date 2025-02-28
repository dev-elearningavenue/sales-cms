import { NextResponse } from "next/server";
import { watchCollections } from "@/lib/mongoListener";

export async function GET() {
  console.log("Calling watchCollections() method from start_listener api.");
//   watchCollections();
  return NextResponse.json({ message: "Listener started" });
}
