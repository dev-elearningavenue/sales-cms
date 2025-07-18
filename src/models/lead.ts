import mongoose, { Schema, Model } from "mongoose";
import { ILead } from "@/types/leads";

const lead_category_enum = [
  "Order Creation",
  "Abandoned Cart",
  "Free SignUp",
  "Free Study Guide",
  "Contact Us",
  "Scholarship",
  "Custom Lead",
  "Unpaid Training",
  "Short Course Discount",
  "SC Group Discount",
  "Unknown"
] as const;

const status_enum = [
  "Pending",
  "LVM",
  "Follow Up",
  "Follow Up 1",
  "Follow Up 2",
  "Follow Up 3",
  "Closed",
] as const;

const resolve_status_enum = [
  "Pending",
  "Resolved",
  "Converted",
  "Order Assigned",
  "Paid",
] as const;

// Define Lead Schema
const leadSchema = new Schema<ILead>(
  {
    category: {
      type: String,
      enum: lead_category_enum,
      required: true,
    },
    contact_us: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
    },
    scholarship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scholarship",
      required: false,
    },
    free_signup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    abandoned_cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AbandonedCart",
      required: false,
    },
    order_creation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderCreation",
      required: false,
    },
    shortcourse_discount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortCourseDiscount",
      required: false,
    },
    custom_lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomLead",
      required: false,
    },
    status: {
      type: String,
      enum: status_enum,
    },
    resolve_status: {
      type: String,
      enum: resolve_status_enum,
    },
    assigned: {
      type: Boolean,
      required: true,
      default: false,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    assignedAt: {
      type: Date,
      required: false,
      default: null,
    },
    resolved: {
      type: Boolean,
      required: false,
      default: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: new mongoose.Types.ObjectId("67b33a327fa1571a2f0e1e4b"),
    },
    domain: {
      type: String,
      // enum: ["OOR", "OOC", "OES", "FOC", "OSHAPRO", "Osha360"],
      required: true,
    },
    next_follow_up: {
      type: [
        {
          date: { type: Date, required: true },
          contact_type: { type: [String], enum: ["chat", "email", "call"], required: true },
          notes: { type: String }
        }
      ],
      default: [],
    },
    conversion_value: {
      type: Number,
      required: false,
      default: null,
    },
    notes: {
      type: [
        {
          text: String,
          created_at: {
            type: Date,
            default: Date.now,
          },
          created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
