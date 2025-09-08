// src/utils/auth.ts
import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";
import { IUser } from "@/models/user";
import { TokenPayload } from "@/types/auth";

export const generateToken = async (user: IUser): Promise<string> => {
  // console.log("User before generating token: ", user);

  const userPayload: TokenPayload = {
    _id: user._id ? user._id.toString() : "",
    email: user.email || "",
    full_name: user.full_name || "",
    user_name: user.user_name || "",
    user_type: user.user_type || 3,
    assignedDomain: user.assignedDomain || "",
  };
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(userPayload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export const verifyToken = async (token: string) => {
  // const secret = process.env.JWT_SECRET;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!secret)
      return {
        success: false,
        message: "JWT_SECRET not found.",
      };
    return {
      success: true,
      data: payload,
    };
  } catch (error: any) {
    console.log("Error in decoding token: ", error.message);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
