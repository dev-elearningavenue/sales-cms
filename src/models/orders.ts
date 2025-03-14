import mongoose, { Schema } from "mongoose";

const OrderSchema = new Schema({}, { strict: false });

export const OrderCreation = mongoose.models.OrderCreation || 
  mongoose.model("OrderCreation", OrderSchema, "paidorders");

export default OrderCreation; 