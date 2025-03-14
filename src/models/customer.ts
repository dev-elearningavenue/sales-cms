import mongoose, { Schema } from "mongoose";
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

// export const Customerr: Model<ICustomer> =
//   mongoose.models.Lead || mongoose.model<ICustomer>("Lead", CustomerSchemaa);

// export default Customer;
const CustomerSchema = new Schema({}, { strict: false });
export const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema, "customers");
export default Customer;