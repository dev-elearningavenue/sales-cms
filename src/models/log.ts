import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  sourceDbId: mongoose.Types.ObjectId; 
  syncedId: mongoose.Types.ObjectId;
  sourceDomain: string;
  synced: string; 
}

const LogSchema = new Schema<ILog>(
  {
    sourceDbId: { type: Schema.Types.ObjectId, required: true },
    syncedId: { type: Schema.Types.ObjectId, required: true },
    sourceDomain: { type: String, required: true },
    synced: { type: String, default: "success" },
  },
  { timestamps: true }
);

const Log = mongoose.model<ILog>("Log", LogSchema);
export default Log
