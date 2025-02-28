import mongoose from "mongoose";
import { watchCollections } from "./mongoListener";

let isConnected = false;
const dbConnect = async () => {
  if (isConnected || mongoose.connections[0].readyState) {
    console.log(
      "Already connected to MongoDB",
      mongoose.connections[0].readyState
    );
    return;
  }
  const dbUri = process.env.MONGODB_URI || "your_mongo_connection_string";

  try {
    await mongoose.connect(dbUri);
    isConnected = true;
    console.log("MongoDB connected successfully.");
    // watchCollections();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw new Error("MongoDB connection failed");
  }
};

export default dbConnect;
