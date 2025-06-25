import mongoose from "mongoose";

export interface ICoupon {
  _id: string;
  code: string;
  value: number;
  category: "OSHA10" | "OSHA30" | "PureSafety";
  is_used: boolean;
  used_by: mongoose.Types.ObjectId;
  type: string;
  created_by: string;
  start_date: Date;
  expiry_date: Date;
  uses: number;
  status: string;
}
