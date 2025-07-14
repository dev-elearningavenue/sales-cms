import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShortCourseDiscount extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    courseTitle: string;
    courseUrl: string;
    quantity: number;
    domain: string;
}

const shortCourseDiscountSchema = new Schema<IShortCourseDiscount>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    courseTitle: { type: String, required: true },
    courseUrl: { type: String, required: true },
    quantity: { type: Number, required: true },
    domain: { type: String, required: true },
  },
  { timestamps: true }
);

const ShortCourseDiscount: Model<IShortCourseDiscount> =
  mongoose.models.ShortCourseDiscount ||
  mongoose.model<IShortCourseDiscount>("ShortCourseDiscount", shortCourseDiscountSchema, "shortcoursediscounts");

export default ShortCourseDiscount; 