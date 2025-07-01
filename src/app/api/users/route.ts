import { NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import { getUsers } from "@/controllers/userController";
import connectDB from "@/lib/db";
export const dynamic = "force-dynamic";

async function connectDatabase() {
  await connectDB();
}
connectDatabase();

export async function GET(req: Request) {
  try {
    // Get current user from token
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = tokenData._id.toString();
    const userType = Number(tokenData.user_type);

    try {
      const result = await getUsers(userId, userType);

      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error("Error in getUsers API:", error);
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to fetch users",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in users' GET API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}
