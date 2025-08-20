import mongoose, { Schema, Model, Document } from "mongoose";

export interface CourseInterest {
  courseName: string;
  quantity: number;
}

export interface ICustomLead extends Document {
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  domain: "OOR" | "OOC" | "OES";
  supportType: "call" | "chat" | "email";
  customerQuery: string;
  coursesInterested: CourseInterest[];
  createdAt?: Date;
  updatedAt?: Date;
}

const courseInterestSchema = new Schema({
  courseName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
});

const customLeadSchema = new Schema<ICustomLead>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    contactNo: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      // enum: ["OOR", "OOC", "OES", "FOC", "OSHAPRO", "Osha360", "30Construction", "NY30", "EHSS", "EHSP", "OP"],
      required: true,
    },
    supportType: {
      type: String,
      enum: ["call", "chat", "email"],
      required: true,
    },
    customerQuery: {
      type: String,
      required: true,
    },
    coursesInterested: {
      type: [courseInterestSchema],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

const CustomLead: Model<ICustomLead> =
  mongoose.models.CustomLead || mongoose.model<ICustomLead>("CustomLead", customLeadSchema);

export default CustomLead; 