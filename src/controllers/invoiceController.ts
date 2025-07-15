import connectDB from "@/lib/db";
import Invoice, { IInvoice, IInvoiceProduct } from "@/models/invoice";
import mongoose from "mongoose";

export interface CreateInvoiceRequest {
  customerId: string;
  customerEmail: string;
  siteName: string;
  products: IInvoiceProduct[];
  dueDate: string;
  coupon?: string;
  agentName: string;
  agentId: string;
  subtotal: number;
  discount?: number;
  totalPrice: number;
  percent_off?: string;
  hostedUrl?: string;
  invoiceNumber?: string;
}

export interface CreateInvoiceResponse {
  success: boolean;
  message: string;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  hostedUrl?: string;
  percent_off?: string;
}

export const createInvoice = async (
  invoiceData: CreateInvoiceRequest
): Promise<CreateInvoiceResponse> => {
  try {
    await connectDB();
    // console.log("Invoice data received:", invoiceData);

    // Validate required fields
    if (
      !invoiceData.customerId ||
      !invoiceData.customerEmail ||
      !invoiceData.siteName
    ) {
      return {
        success: false,
        message: "Customer ID, email, and site name are required",
        error: "Missing required fields",
      };
    }

    if (!invoiceData.products || invoiceData.products.length === 0) {
      return {
        success: false,
        message: "At least one product is required",
        error: "No products provided",
      };
    }

    if (!invoiceData.dueDate || invoiceData.dueDate.trim() === "") {
      return {
        success: false,
        message: "Due date is required",
        error: "Missing due date",
      };
    }

    if (!invoiceData.agentName || !invoiceData.agentId) {
      return {
        success: false,
        message: "Agent information is required",
        error: "Missing agent information",
      };
    }

    // Validate products
    for (const product of invoiceData.products) {
      if (
        !product.product_id ||
        !product.name ||
        !product.price_id ||
        product.quantity <= 0
      ) {
        return {
          success: false,
          message:
            "All products must have valid product_id, name, price_id, and quantity > 0",
          error: "Invalid product data",
        };
      }
    }
    // Create the invoice
    const newInvoice = new Invoice({
      customerId: invoiceData.customerId,
      customerEmail: invoiceData.customerEmail,
      siteName: invoiceData.siteName,
      products: invoiceData.products,
      dueDate: invoiceData.dueDate,
      coupon: invoiceData.coupon || "",
      agentName: invoiceData.agentName,
      agentId: new mongoose.Types.ObjectId(invoiceData.agentId),
      subtotal: invoiceData.subtotal,
      discount: invoiceData.discount || 0,
      totalPrice: invoiceData.totalPrice,
      percent_off: invoiceData.percent_off || "",
      hostedUrl: invoiceData.hostedUrl || "",
      invoiceNumber: invoiceData.invoiceNumber || "",
      status: "unpaid",
    });

    const savedInvoice = await newInvoice.save();

    return {
      success: true,
      message: "Invoice created successfully",
    };
  } catch (error: any) {
    console.error("Error creating invoice:", error);

    // Handle duplicate invoice number error
    if (error.code === 11000 && error.keyPattern?.invoiceNumber) {
      return {
        success: false,
        message: "Invoice number already exists. Please try again.",
        error: "Duplicate invoice number",
      };
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      console.error("Validation errors:", validationErrors);
      return {
        success: false,
        message: "Validation failed: " + validationErrors.join(", "),
        error: "Validation error",
      };
    }

    return {
      success: false,
      message: "Failed to create invoice",
      error: error.message || "Unknown error occurred",
    };
  }
};

export const getInvoiceById = async (
  invoiceId: string
): Promise<IInvoice | null> => {
  try {
    await connectDB();
    const invoice = await Invoice.findById(invoiceId).populate('agentId', 'full_name');
    return invoice;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return null;
  }
};

// Get all invoices created by a specific agent
export const getInvoicesByAgent = async (agentId: string) => {
  try {
    await connectDB();
    const invoices = await Invoice.find({ agentId: new mongoose.Types.ObjectId(agentId) })
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 });
    return invoices;
  } catch (error) {
    console.error("Error fetching agent invoices:", error);
    return [];
  }
};

export const getInvoicesByCustomer = async (
  customerId: string
): Promise<IInvoice[]> => {
  try {
    await connectDB();
    const invoices = await Invoice.find({ customerId })
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 });
    return invoices;
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    return [];
  }
};

export const getAllInvoices = async (): Promise<IInvoice[]> => {
  try {
    await connectDB();
    const invoices = await Invoice.find({})
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 });
    return invoices;
  } catch (error) {
    console.error("Error fetching all invoices:", error);
    return [];
  }
};

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: "unpaid" | "sent" | "paid" | "overdue" | "cancelled"
): Promise<boolean> => {
  try {
    await connectDB();
    const result = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status },
      { new: true }
    );
    return !!result;
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return false;
  }
};
