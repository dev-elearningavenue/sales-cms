"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("./models");
let isConnected = false;
const connectDB = async () => {
    if (isConnected || mongoose_1.default.connections[0].readyState) {
        // console.log(
        //   "Already connected to MongoDB",
        //   mongoose.connections[0].readyState
        // );
        return;
    }
    try {
        (0, models_1.ensureModelsAreRegistered)();
        const dbUri = process.env.MONGODB_URI || "mongo_connection_string";
        await mongoose_1.default.connect(dbUri);
        isConnected = true;
        // console.log("MongoDB connected successfully.");
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        isConnected = false;
        throw new Error("MongoDB connection failed");
    }
};
exports.default = connectDB;
