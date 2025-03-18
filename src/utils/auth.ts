// src/utils/auth.ts
import jwt from "jsonwebtoken";
import { jwtVerify, SignJWT } from "jose";
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
  };
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(userPayload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export const verifyToken = async (token: string) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET not found in environment variables");
    return {
      success: false,
      message: "JWT_SECRET not found in server configuration",
    };
  }

  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error("Invalid token format provided");
    return {
      success: false,
      message: "Invalid token format",
    };
  }

  try {
    // Try to verify with jose first
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      return {
        success: true,
        data: payload,
      };
    } catch (joseError) {
      // Fall back to jsonwebtoken if jose fails
      console.log("Jose verification failed, trying jsonwebtoken fallback");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      return {
        success: true,
        data: decoded,
      };
    }
  } catch (error: any) {
    console.error("Token verification error:", error.message);
    
    // Return more descriptive error
    let errorMessage = "Unknown error occurred";
    
    if (error.name === "TokenExpiredError") {
      errorMessage = "Token has expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token signature";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};
