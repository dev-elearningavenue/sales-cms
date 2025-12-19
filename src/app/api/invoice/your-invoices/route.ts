import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/utils/auth";
import { TokenPayload } from "@/types/auth";
import { getInvoicesByAgent } from "@/controllers/invoiceController";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token");
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const tokenResult = await verifyToken(token.value);
    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json({ success: false, error: "Invalid authentication" }, { status: 401 });
    }
    const userData = tokenResult.data as unknown as TokenPayload;
    
    // Parse query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50", 10);
    
    // Fetch invoices created by this agent with pagination
    const result = await getInvoicesByAgent(userData._id, { page, pageSize });
    
    return NextResponse.json({ 
      success: true, 
      invoices: result.invoices,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
