import mongoose, { Schema, Model } from "mongoose";
import { ICoupon } from "@/types/coupon";

const Coupon: Schema<ICoupon> = new Schema(
  {
    code: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    category: { type: String, required: true },
    is_used: { type: Boolean, default: false },
    used_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    type: { type: String, required: true },
    created_by: { type: String, required: true },
    start_date: { type: Date, required: true },
    expiry_date: { type: Date, required: true },
    uses: { type: Number, default: 0 },
    status: { type: String, default: "Enabled" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICoupon>("AccountCredit", Coupon);
