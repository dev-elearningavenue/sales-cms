import connectDB from "@/lib/db";
import Invoice, { IInvoice, IInvoiceProduct } from "@/models/invoice";
import { deleteLead } from "@/controllers/leadController";
import Lead from "@/models/lead";
import mongoose from "mongoose";

export interface CreateInvoiceRequest {
  customerId: string;
  customerEmail: string;
  firstName?: string;
  lastName?: string;
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
      email: invoiceData.customerEmail,
      firstName: invoiceData.firstName || "",
      lastName: invoiceData.lastName || "",
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
    
    // console.log("New Invoice object:", newInvoice);

    const savedInvoice = await newInvoice.save();

    return {
      success: true,
      message: "Invoice created successfully",
      invoiceId: savedInvoice._id.toString(),
      invoiceNumber: savedInvoice.invoiceNumber,
      hostedUrl: savedInvoice.hostedUrl,
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

// Get all invoices created by a specific agent (excluding only unpaid invoices with past due dates)
export const getInvoicesByAgent = async (agentId: string) => {
  try {
    await connectDB();
    
    // Get current date in US Eastern Time
    const now = new Date();
    const usEasternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    // Format the date for comparison (YYYY-MM-DD)
    const currentDate = usEasternTime.toISOString().split('T')[0];
    
    const allInvoices = await Invoice.find({ 
      agentId: new mongoose.Types.ObjectId(agentId)
    })
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 });
    
    // Filter invoices based on due date (only exclude unpaid invoices with past due dates)
    const filteredInvoices = allInvoices.filter(invoice => {
      // If invoice is paid, include it regardless of due date
      if (invoice.status === 'paid') {
        return true;
      }
      
      // For unpaid invoices, check if due date has passed
      if (invoice.status === 'unpaid') {
        const dueDate = invoice.dueDate;
        if (!dueDate) return false;
        
        // Try to parse the due date - handle different formats
        let parsedDueDate: Date;
        // If it's already a Date object
        if (typeof dueDate === 'object' && dueDate !== null && Object.prototype.toString.call(dueDate) === '[object Date]') {
          parsedDueDate = dueDate as Date;
        } else {
          // If it's a string, try to parse it
          parsedDueDate = new Date(dueDate as string);
        }
        
        // If parsing failed, skip this invoice
        if (isNaN(parsedDueDate.getTime())) {
          return false;
        }
        
        // Convert due date to US Eastern Time for comparison
        const dueDateInEastern = new Date(parsedDueDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const dueDateString = dueDateInEastern.toISOString().split('T')[0];
        
        // Compare dates as strings (YYYY-MM-DD format)
        const isNotPastDue = dueDateString >= currentDate;
        
        if (!isNotPastDue) {
          // console.log(`Excluding unpaid invoice ${invoice._id} - Due date: ${dueDateString}, Current: ${currentDate}`);
        }
        
        return isNotPastDue;
      }
      
      // For other statuses (sent, overdue, cancelled), include them
      return true;
    });
    
    return filteredInvoices;
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

export const deleteInvoice = async (
  invoiceId: string,
  userId: string,
  userType: number
): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    await connectDB();
    
    // Check if invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        error: "Invoice not found",
      };
    }

    // Delete the invoice
    const result = await Invoice.findByIdAndDelete(invoiceId);
    
    if (!result) {
      return {
        success: false,
        message: "Failed to delete invoice",
        error: "Delete operation failed",
      };
    }

    // Also delete the associated lead if it exists
    try {
      // Find the lead associated with this invoice
      const lead = await Lead.findOne({ invoice: invoiceId });
      if (lead) {
        // Use the existing deleteLead function to properly clean up all associated records
        // We need to pass userType 1 (admin) to allow deletion
        const result = await deleteLead(lead._id.toString(), userId, userType);
        if (!result.success) {
          console.warn("Failed to delete associated lead:", result.message);
        }
      }
    } catch (leadError) {
      console.warn("Failed to delete associated lead:", leadError);
      // Don't fail the invoice deletion if lead deletion fails
    }

    return {
      success: true,
      message: "Invoice and associated lead deleted successfully",
    };
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    return {
      success: false,
      message: "Failed to delete invoice",
      error: error.message || "Unknown error occurred",
    };
  }
};
