import mongoose from "mongoose";

let isConnected = false;
const dbConnect = async () => {
  if (isConnected || mongoose.connections[0].readyState) {
    console.log(
      "Already connected to MongoDB",
      mongoose.connections[0].readyState
    );
    return;
  }
  
  try {
    const dbUri = process.env.MONGODB_URI || "your_mongo_connection_string";
    await mongoose.connect(dbUri);
    isConnected = true;
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    isConnected = false;
    throw new Error("MongoDB connection failed");
  }
};

export default dbConnect;
