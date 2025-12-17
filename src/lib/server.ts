// src/lib/server.ts
import dbConnect from "./db";
import { watchCollections } from "@/lib/mongoListener";

let isInitialized = false;
let isInitializing = false; // Prevent concurrent initialization

async function initServer() {
  if (isInitialized || isInitializing) {
    // console.log("Streams already initialized or initializing");
    return;
  }

  isInitializing = true;

  try {
    await dbConnect();
    
    await watchCollections();
    
    isInitialized = true;
    console.log("🚀 Server initialization complete");
  } catch (error) {
    console.error("Server initialization failed:", error);
    // Don't set isInitialized on failure so it can retry
  } finally {
    isInitializing = false;
  }
}

// Only initialize once (guard against module being reloaded)
if (!isInitialized && !isInitializing) {
  (async () => {
    await initServer();
  })();
}

export { isInitialized };
