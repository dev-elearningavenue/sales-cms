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
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      deletedAt: null,
    }).populate("agentId", "full_name");
    return invoice;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return null;
  }
};

// Get all invoices created by a specific agent
export const getInvoicesByAgent = async (agentId: string, options?: {
  page?: number;
  pageSize?: number;
}) => {
  try {
    await connectDB();
    
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const skip = (page - 1) * pageSize;
    
    // Get current date in US Eastern Time
    const now = new Date();
    const usEasternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    // Format the date for comparison (YYYY-MM-DD)
    const currentDate = usEasternTime.toISOString().split('T')[0];

    const filter = {
      agentId: new mongoose.Types.ObjectId(agentId),
      deletedAt: null,
    };

    const totalCount = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();
    
    // Filter invoices based on due date (only exclude unpaid invoices with past due dates)
    const filteredInvoices = invoices.filter((invoice: any) => {
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
        if (typeof dueDate === 'object' && dueDate !== null && Object.prototype.toString.call(dueDate) === '[object Date]') {
          parsedDueDate = dueDate as Date;
        } else {
          parsedDueDate = new Date(dueDate as string);
        }
        
        if (isNaN(parsedDueDate.getTime())) {
          return false;
        }
        
        const dueDateInEastern = new Date(parsedDueDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const dueDateString = dueDateInEastern.toISOString().split('T')[0];
        
        return dueDateString >= currentDate;
      }
      
      return true;
    });
    
    // Paginate the filtered results
    // const totalCount = filteredInvoices.length;
    const paginatedInvoices = filteredInvoices.slice(skip, skip + pageSize);
    
    return {
      // invoices: paginatedInvoices,
      invoices,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error("Error fetching agent invoices:", error);
    return {
      invoices: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    };
  }
};

export const getInvoicesByCustomer = async (
  customerId: string
): Promise<IInvoice[]> => {
  try {
    await connectDB();
    const invoices = await Invoice.find({ customerId, deletedAt: null })
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 });
    return invoices;
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    return [];
  }
};

export const getAllInvoices = async (options?: {
  page?: number;
  pageSize?: number;
  agentName?: string;
  status?: string;
  date?: string;
  search?: string;
}) => {
  try {
    await connectDB();
    
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    // Build filter
    const filter: any = { deletedAt: null };
    
    if (options?.status) {
      filter.status = options.status;
    }
    
    if (options?.agentName) {
      filter.agentName = options.agentName;
    }
    
    if (options?.date) {
      if (options.date === "today") {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        filter.createdAt = { $gte: startOfDay, $lt: endOfDay };
      } else {
        const selectedDate = new Date(options.date);
        const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        filter.createdAt = { $gte: startOfDay, $lt: endOfDay };
      }
    }

    // Add search filter
    if (options?.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { invoiceNumber: searchRegex },
        { agentName: searchRegex },
      ];
    }

    // Get total count
    const totalCount = await Invoice.countDocuments(filter);

    // Get paginated invoices
    const invoices = await Invoice.find(filter)
      .populate('agentId', 'full_name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    return {
      invoices,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error("Error fetching all invoices:", error);
    return {
      invoices: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    };
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
    
    // Check if invoice exists (and not already soft-deleted)
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      deletedAt: null,
    });
    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        error: "Invoice not found",
      };
    }

    // Soft-delete the invoice
    invoice.deletedAt = new Date();
    await invoice.save();

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

// Mark invoice as paid manually
export const markInvoiceAsPaid = async (invoiceId: string, userId: string, userType: number) => {
  try {
    await connectDB();

    // Only admin (1) or manager (2) can mark as paid
    if (userType !== 1 && userType !== 2) {
      return {
        success: false,
        message: "Unauthorized: Only admins can mark invoices as paid",
      };
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
      };
    }

    if (invoice.status === "paid") {
      return {
        success: false,
        message: "Invoice is already marked as paid",
      };
    }

    // Update invoice status
    invoice.status = "paid";
    invoice.paidAt = new Date();
    await invoice.save();

    return {
      success: true,
      message: "Invoice marked as paid successfully",
      invoice,
    };
  } catch (error: any) {
    console.error("Error marking invoice as paid:", error);
    return {
      success: false,
      message: "Failed to mark invoice as paid",
      error: error.message || "Unknown error occurred",
    };
  }
};
