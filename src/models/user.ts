import mongoose, { Schema, Document, Model, ObjectId } from "mongoose";

export interface IUser extends Document {
  full_name?: string;
  user_name?: string;
  email?: string;
  password?: string;
  user_type?: number;
  is_blocked?: boolean;
}
// Define User Schema
const userSchema = new Schema<IUser>(
  {
    // _id: {
    //   type: Schema.Types.ObjectId,
    //   required: true,
    // },
    full_name: {
      type: String,
      trim: true,
      required: true,
    },
    user_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    user_type: {
      type: Number,
      required: true,
    },
    is_blocked: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
