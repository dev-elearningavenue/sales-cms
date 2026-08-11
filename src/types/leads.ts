import mongoose from "mongoose";
import { OrderCreation } from "@/types/customer";
import { ICustomLead } from "@/models/customLead";

interface NextFollowUp {
  date: Date;
  contact_type: ("chat" | "email" | "call")[];
  notes?: string;
}

// Define TypeScript Interface for Lead Document
export interface ILead extends Document {
  _id?: string;
  category?: string;
  email?: string;
  fullname?: string;
  contactNo?: string;
  contact_us?: mongoose.Types.ObjectId;
  scholarship?: mongoose.Types.ObjectId;
  free_signup?: mongoose.Types.ObjectId;
  abandoned_cart?: mongoose.Types.ObjectId;
  order_creation?: mongoose.Types.ObjectId | OrderCreation;
  shortcourse_discount?: mongoose.Types.ObjectId;
  custom_lead?: mongoose.Types.ObjectId | ICustomLead;
  invoice?: mongoose.Types.ObjectId;
  sticky_signup?: mongoose.Types.ObjectId;
  status?: string;
  assigned?: Boolean;
  assignedAt?: Date;
  resolved?: Boolean;
  resolvedAt?: Date;
  resolve_status?: string;
  notes?: Array<{
    text: string;
    created_at: Date;
    created_by: mongoose.Types.ObjectId;
  }>;
  assigned_to?: mongoose.Types.ObjectId;
  created_by?: mongoose.Types.ObjectId;
  domain: "OOR" | "OOC" | "OES" | "FOC";
  next_follow_up?: NextFollowUp[];
  conversion_value?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
