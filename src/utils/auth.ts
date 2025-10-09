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
    agentEmail: user.agentEmail || "",
  };
  
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(userPayload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyToken = async (token: string) => {
  try {
    if (!process.env.JWT_SECRET) {
      return {
        success: false,
        message: "JWT_SECRET not found.",
      };
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.exp && payload.exp < Date.now() / 1000) {
      return {
        success: false,
        message: "Token has expired",
      };
    }

    // console.log("Token payload:", payload);
    return {
      success: true,
      data: payload,
    };
  } catch (error: any) {
    console.log("Error in decoding token: ", error.message);
    
    // Handle specific JWT errors
    if (error.code === 'ERR_JWT_EXPIRED') {
      return {
        success: false,
        message: "Token has expired",
      };
    } else if (error.code === 'ERR_JWT_INVALID') {
      return {
        success: false,
        message: "Invalid token format",
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
