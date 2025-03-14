import mongoose, { Schema } from "mongoose";

const AbandonedCartSchema = new Schema({}, { strict: false });

export const AbandonedCart = mongoose.models.AbandonedCart ||
  mongoose.model("AbandonedCart", AbandonedCartSchema, "abandonedcarts");

export default AbandonedCart;