import mongoose, { Schema, Document } from "mongoose";

export interface EmailLogDocument extends Document {
  to: string;
  subject: string;
  body: string;
  agentId: mongoose.Types.ObjectId;
  sentAt: Date;
}

const EmailLogSchema = new Schema<EmailLogDocument>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.EmailLog || mongoose.model<EmailLogDocument>("EmailLog", EmailLogSchema);
