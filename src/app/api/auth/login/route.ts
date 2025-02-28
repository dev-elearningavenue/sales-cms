// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import User, { IUser } from "@/models/user";
import connectDB from "@/lib/db";
import { generateToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { email, password } = await req.json();

    const user = await User.findOne({ email }) as IUser;
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMatch = password === user.password;
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    const token = await generateToken(user);
    // console.log("token generated?: ", token);
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id , // ? user._id.toString() : ""
        email: user.email,
        full_name: user.full_name,
        user_name: user.user_name,
        user_type: user.user_type
      }
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
