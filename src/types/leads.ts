import mongoose from "mongoose";
import { OrderCreation } from "@/types/customer";
import { ICustomLead } from "@/models/customLead";

// Define TypeScript Interface for Lead Document
export interface ILead extends Document {
  _id?: string;
  category?: string;
  contact_us?: mongoose.Types.ObjectId;
  scholarship?: mongoose.Types.ObjectId;
  free_signup?: mongoose.Types.ObjectId;
  abandoned_cart?: mongoose.Types.ObjectId;
  order_creation?: mongoose.Types.ObjectId | OrderCreation;
  custom_lead?: mongoose.Types.ObjectId | ICustomLead;
  status?: string;
  assigned?: Boolean;
  resolve_status?: string;
  assigned_to?: mongoose.Types.ObjectId;
  created_by?: mongoose.Types.ObjectId;
  domain: "OOR" | "OOC" | "OES";
  next_follow_up_date?: Date;
  conversion_value?: number;
  createdAt?: Date;
}
