// src/lib/server.ts
import dbConnect from "./db.js";
import { watchCollections } from "./mongoListener";
// const { watchCollections } = require("./mongoListener");

let isInitialized = false;
async function initServer() {
  if (isInitialized) {
    console.log("Streams already initialized");
    return;
  }

  try {
    await watchCollections();
    console.log("MongoDB change streams initialized");

    isInitialized = true;
  } catch (error) {
    console.error("Server initialization failed:", error);
  }
}

(async () => {
  await initServer();
})();

export  { isInitialized };