import mongoose, { Schema, Model, Document } from "mongoose";

export interface IManagerLead extends Document {
  companyName: string;
  companyEmail: string;
  contactNo: string;
  firstName: string;
  lastName: string;
  notes?: string;
  status: "pending" | "processing" | "resolved" | "closed" | "follow_up";
  statusCategory: "Interested" | "Invalid Contact" | "Delayed Interest" | "Rejection";
  resolveStatus?: string;
  assigned?: boolean;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  source: string;
  uploadedBy?: mongoose.Types.ObjectId;
  domain?: string;
  next_follow_up?: Array<{
    date: Date;
    contact_type: ("chat" | "email" | "call")[];
    notes?: string;
    status?: string;
  }>;
  contactHistory?: Array<{
    date: Date;
    type: ("chat" | "email" | "call")[];
    notes?: string;
    status: string;
    by?: mongoose.Types.ObjectId;
  }>;
  resolveHistory?: Array<{
    date: Date;
    statusCategory: string;
    status: string;
    resolveStatus: string;
    notes?: string;
    followUp?: boolean;
    followUpDate?: Date;
    emailSent?: boolean;
    by?: mongoose.Types.ObjectId;
  }>;
  emails?: mongoose.Types.ObjectId[];
  lastContacted?: Date;
  lastStatusChange?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const followUpSchema = new Schema({
  date: { type: Date, required: true },
  contact_type: { type: [String], enum: ["chat", "email", "call"], required: true },
  notes: { type: String },
  status: { type: String, default: "scheduled" }
}, { _id: false });

const contactHistorySchema = new Schema({
  date: { type: Date, required: true },
  type: { type: [String], enum: ["chat", "email", "call"], required: true },
  notes: { type: String },
  status: { type: String, required: true },
  by: { type: Schema.Types.ObjectId, ref: "User" }
}, { _id: false });

const resolveHistorySchema = new Schema({
  date: { type: Date, required: true, default: Date.now },
  statusCategory: { type: String, required: true, enum: ["Interested", "Invalid Contact", "Delayed Interest", "Rejection"] },
  status: { type: String, required: true },
  resolveStatus: { type: String, required: true },
  notes: { type: String },
  followUp: { type: Boolean, default: false },
  followUpDate: { type: Date },
  emailSent: { type: Boolean, default: false },
  by: { type: Schema.Types.ObjectId, ref: "User" }
}, { _id: false });

const managerLeadSchema = new Schema<IManagerLead>(
  {
    companyName: { type: String, required: true, trim: true },
    companyEmail: { type: String, required: false, trim: true, lowercase: true, default: "" },
    contactNo: { type: String, required: false, trim: true, default: "" },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    statusCategory: {
      type: String,
      enum: ["Interested", "Invalid Contact", "Delayed Interest", "Rejection"],
    },
    resolveStatus: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processing", "resolved", "closed", "follow_up"],
      default: "pending",
    },
    assigned: { type: Boolean, default: false },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    source: { type: String, trim: true, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    domain: { type: String, trim: true, default: "" },
    next_follow_up: { type: [followUpSchema], default: [] },
    contactHistory: { type: [contactHistorySchema], default: [] },
    resolveHistory: { type: [resolveHistorySchema], default: [] },
    emails: [{ type: Schema.Types.ObjectId, ref: "EmailLog" }],
    lastContacted: { type: Date },
    lastStatusChange: { type: Date },
  },
  { timestamps: true }
);

managerLeadSchema.index({ companyEmail: 1 });
managerLeadSchema.index({ status: 1 });
managerLeadSchema.index({ statusCategory: 1 });
managerLeadSchema.index({ assignedTo: 1 });
managerLeadSchema.index({ createdAt: -1 });

const ManagerLead: Model<IManagerLead> =
  mongoose.models.ManagerLead || mongoose.model<IManagerLead>("ManagerLead", managerLeadSchema);

export default ManagerLead;
