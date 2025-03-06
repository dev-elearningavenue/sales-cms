import mongoose, { Schema, Model } from "mongoose";
import { ICustomer } from "@/types/customer";


const CustomerSchemaa = new Schema(
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

/*
const CustomerSchemaa = new Schema(
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
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    country: {
      type: String,
    },
    companyName: {
      type: String,
    },
    companyType: {
      type: String,
    },
    companyEmail: {
      type: String,
    },
    enrollEmail: {
      type: String,
    },
    designation: String,
    courses: [Object],
    purchased_courses: [Object],
    free_course_tot_qty: {
      type: Number,
    },
    free_course_assign_qty: {
      type: Number,
    },
    userType: {
      type: Number,
    },
    is_account_enabled: {
      type: Boolean,
    },
    is_blocked: {
      type: Boolean,
    },
    freeSignUp: Boolean,
    freeStudyGuide: Boolean,
  },
  {
    timestamps: true,
  }
);
*/

// export const Customerr: Model<ICustomer> =
//   mongoose.models.Lead || mongoose.model<ICustomer>("Lead", CustomerSchemaa);

// export default Customer;
const CustomerSchema = new Schema({}, { strict: false });
export const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchemaa, "customers");

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
