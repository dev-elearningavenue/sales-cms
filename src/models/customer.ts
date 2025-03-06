import mongoose, { Schema, Model } from "mongoose";
import { ICustomer } from "@/types/customer";
import { strict } from "assert";

const CustomerSchema = new Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    userName: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
    },
    contactNo: {
      type: String,
    },
    userType: {
      type: Number,
    },
    freeSignUp: Boolean,
    freeStudyGuide: Boolean,
  },
  {
    timestamps: true,
    strict: true,
  }
);

export const Customer =
  mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema, "customers");

// export default Customer;
// const CustomerSchemas = new Schema({}, { strict: false });
// export const Customerr =
//   mongoose.models.Customer ||
//   mongoose.model("Customer", CustomerSchema, "customers");

const AbandonedCartSchema = new Schema({}, { strict: false });
export const AbandonedCart =
  mongoose.models.AbandonedCart ||
  mongoose.model("AbandonedCart", AbandonedCartSchema, "abandonedcarts");

const OrderSchema = new Schema({}, { strict: false });
export const OrderCreation =
  mongoose.models.Order ||
  mongoose.model("OrderCreation", OrderSchema, "paidorders");

export const Contact =
  mongoose.models.Contact ||
  mongoose.model(
    "Contact",
    new mongoose.Schema({}, { strict: false }),
    "contacts"
  );

export const Scholarship =
  mongoose.models.Scholarship ||
  mongoose.model(
    "Scholarship",
    new mongoose.Schema({}, { strict: false }),
    "scholarships"
  );
