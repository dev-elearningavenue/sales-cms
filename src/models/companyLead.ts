import mongoose, { Schema, Model, Document } from "mongoose";

export interface SocialMedia {
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

export interface ICompanyLead extends Document {
  companyName: string;
  companyEmail: string;
  contactNo: string;
  address: string;
  companyWebsite?: string;
  socials?: SocialMedia;
  state: string;
  city?: string;
  zipCode?: string;
  country?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  notes?: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost" | "pending" | "follow_up";
  assigned?: boolean;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  nextFollowUp?: Date;
  followUpNotes?: string;
  conversionValue?: number;
  source: string; // CSV file name or source
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
  lastContacted?: Date;
  lastStatusChange?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const socialMediaSchema = new Schema({
  linkedin: String,
  facebook: String,
  twitter: String,
  instagram: String,
  youtube: String,
}, { _id: false });

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

const companyLeadSchema = new Schema<ICompanyLead>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: "",
    },
    contactNo: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    companyWebsite: {
      type: String,
      trim: true,
      default: "",
    },
    socials: {
      type: socialMediaSchema,
      default: {},
    },
    state: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "US",
    },
    industry: {
      type: String,
      trim: true,
      default: "",
    },
    companySize: {
      type: String,
      trim: true,
      default: "0",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    contactPersonEmail: {
      type: String,
      trim: true,
      default: "",
    },
    contactPersonPhone: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },
    assigned: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },
    nextFollowUp: {
      type: Date,
    },
    followUpNotes: {
      type: String,
      trim: true,
    },
    conversionValue: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    domain: {
      type: String,
      trim: true,
      default: "",
    },
    next_follow_up: {
      type: [followUpSchema],
      default: [],
    },
    contactHistory: {
      type: [contactHistorySchema],
      default: [],
    },
    lastContacted: {
      type: Date,
    },
    lastStatusChange: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
companyLeadSchema.index({ companyEmail: 1 });
companyLeadSchema.index({ state: 1 });
companyLeadSchema.index({ status: 1 });
companyLeadSchema.index({ assignedTo: 1 });
companyLeadSchema.index({ createdAt: -1 });

const CompanyLead: Model<ICompanyLead> =
  mongoose.models.CompanyLead || mongoose.model<ICompanyLead>("CompanyLead", companyLeadSchema);

export default CompanyLead;
