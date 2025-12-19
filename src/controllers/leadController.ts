import Lead from "@/models/lead";
import { ILead } from "@/types/leads";
import CustomLead, { ICustomLead } from "@/models/customLead";
import mongoose from "mongoose";
import {
  createNewLeadNotification,
  createLeadAssignedNotification,
  createStatusChangeNotification,
} from "@/services/notificationService";
import connectDB from "@/lib/db";

// For server-side only imports
let socketServer:
  | {
      emitNewLead: (lead: any) => void;
      emitLeadAssigned: (lead: any) => void;
      emitLeadStatusChanged: (lead: any) => void;
      emitLeadDeleted: (leadId: string) => void;
    }
  | undefined;

if (typeof window === "undefined") {
  // Only import on server-side
  socketServer = require("../../server/socketServer");
}

// Status enums for reference
export const status_enum = [
  "Follow Up",
  "Follow Up 1",
  "Follow Up 2",
  "Follow Up 3",
  "Closed",
  "Pending",
] as const;

export const resolve_status_enum = [
  "Pending",
  "Resolved",
  "Converted",
  "Order Assigned",
  "Paid",
] as const;

// Reusability:
// Agar aapko similar logic multiple jagah pe chahiye ho, toh aap controller functions ko import karke reuse kar sakte hain.

// Mongoose will simply return null for unpopulated fields - this is much faster
const LEAD_POPULATIONS = [
  { path: "free_signup", model: "Customer" },
  { path: "contact_us", model: "Contact" },
  { path: "abandoned_cart", model: "AbandonedCart" },
  { path: "scholarship", model: "Scholarship" },
  { path: "order_creation", model: "OrderCreation" },
  { path: "custom_lead", model: "CustomLead" },
  { path: "shortcourse_discount", model: "ShortCourseDiscount" },
  { path: "invoice", model: "Invoice" },
  { path: "assigned_to", model: "User", select: "full_name user_name" },
];

export const getAllLeads = async (options?: {
  limit?: number;
  skip?: number;
  latest?: boolean;
  category?: string;
  assignedTo?: string;
  search?: string;
}) => {
  try {
    // Default pagination: 50 records (smallest option from UI)
    const limit = options?.limit ?? 50;
    const skip = options?.skip ?? 0;

    // Build query filter
    const filter: any = {};
    if (options?.category) {
      filter.category = options.category;
    }

    // Assignment filter
    if (options?.assignedTo) {
      if (options.assignedTo.toLowerCase() === "unassigned") {
        filter.assigned_to = null ;
      } else if (options.assignedTo.toLowerCase() === "assigned") {
        filter.assigned_to = { $exists: true, $ne: null };
      } else {
        // Specific user ID
        filter.assigned_to = options.assignedTo;
      }
    }

    // Search filter - search across multiple fields
    if (options?.search && options.search.trim()) {
      const searchRegex = new RegExp(options.search.trim(), "i");
      filter.$or = [
        { fullname: searchRegex },
        { email: searchRegex },
        { contactNo: searchRegex },
        { category: searchRegex },
        { domain: searchRegex },
        { status: searchRegex },
      ];
    }

    // Get total count FIRST (single fast query with no population)
    const totalCount = await Lead.countDocuments(filter);

    // Then get paginated leads with population
    const leads = await Lead.find(filter)
      .sort(options?.latest === false ? { createdAt: 1 } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(LEAD_POPULATIONS)
      .lean();

    return { 
      message: "All leads fetched successfully", 
      leads,
      total: totalCount,
      showing: leads.length,
      page: Math.floor(skip / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + leads.length < totalCount,
    };
  } catch (error: any) {
    console.error("Error fetching leads:", error.message);
    return {
      error: "Failed to fetch leads",
      details: error.message,
      leads: [],
      total: 0,
      showing: 0,
    };
  }
};

export const createBulkLeads = async (
  ids: string[],
  requestBody: Partial<ILead>
) => {
  const {
    category,
    contact_us,
    scholarship,
    free_signup,
    abandoned_cart,
    order_creation,
    shortcourse_discount,
    custom_lead,
    invoice,
    status,
    resolve_status,
    assigned,
    assigned_to,
    created_by,
    domain,
    next_follow_up,
    conversion_value,
  } = requestBody;

  // Required fields validation
  if (!category || !domain || assigned === null) {
    return {
      success: false,
      message: "Category, Domain, and assigned status are required.",
    };
  }
  const getRandomCategory = () => {
    return Math.random() < 0.5 ? "Free SignUp" : "Free Study Guide";
  };

  // Create the bulk operations array
  const bulkOps = ids.map((id) => ({
    insertOne: {
      document: {
        category: "Contact Us",
        contact_us: id,
        scholarship: scholarship || null,
        free_signup: free_signup || null,
        abandoned_cart: abandoned_cart || null,
        status: status || "Pending",
        resolve_status: resolve_status || "Pending",
        assigned: assigned,
        assigned_to: assigned_to || null,
        created_by: created_by,
        domain: domain,
        next_follow_up: next_follow_up,
        conversion_value: conversion_value,
      },
    },
  }));

  try {
    // await newLead.save();
    const result = await Lead.bulkWrite(bulkOps);

    // Create notifications for each new lead
    // Note: This is async but we don't wait for it to complete
    if (result.insertedCount > 0) {
      // Get the newly created leads
      const newLeads = await Lead.find({
        _id: { $in: Object.values(result.insertedIds).map((id) => id) },
      }).populate([
        { path: "contact_us", model: "Contact" },
        { path: "assigned_to", model: "User", select: "full_name user_name" },
      ]);

      // Create notification for each lead
      for (const lead of newLeads) {
        createNewLeadNotification(lead);

        // Emit socket event for each new lead - only on server
        if (socketServer) {
          socketServer.emitNewLead(lead);
        }
      }
    }

    return {
      success: true,
      message: "Leads created successfully",
      insertedCount: result.insertedCount,
    };
  } catch (error: any) {
    if (error.cause) {
      console.error("Cause of error:", error.cause);
    }
    return { 
      success: false, 
      message: "Error creating bulk leads", 
      error: error.message 
    };
  }
};

export const createLead = async (requestBody: Partial<ILead>) => {
  const {
    category,
    invoice,
    status,
    email,
    fullname,
    contactNo,
    resolve_status,
    assigned,
    assigned_to,
    created_by,
    domain,
    next_follow_up,
    conversion_value,
  } = requestBody;

  // Required fields validation
  if (!category || !domain || assigned === null) {
    return {
      success: false,
      message: "Category, Domain, and assigned status are required.",
    };
  }

  try {
    // console.log("Creating lead controller:", requestBody);
    const newLead = new Lead({
      category,
      invoice: invoice || null,
      status: status || "Pending",
      email: email || "",
      fullname: fullname || "",
      contactNo: contactNo || "",
      resolve_status: resolve_status || "Pending",
      assigned,
      assigned_to: assigned_to || null,
      assignedAt: new Date(),
      resolved: false,
      resolvedAt: null,
      created_by: created_by,
      domain,
      next_follow_up,
      conversion_value,
      notes: [],
    });

    const savedLead = await newLead.save();

    // Populate the lead for notifications and socket events
    const populatedLead = await Lead.findById(savedLead._id).populate([
      { path: "assigned_to", model: "User", select: "full_name user_name" },
      { path: "invoice", model: "Invoice" },
    ]);

    if (populatedLead) {
      createNewLeadNotification(populatedLead);

      if (socketServer) {
        socketServer.emitNewLead(populatedLead);
      }
    }

    return {
      success: true,
      message: "Invoice Lead created successfully",
      lead: populatedLead,
    };
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return { 
      success: false, 
      message: "Error creating Invoice Lead", 
      error: error.message 
    };
  }
};

export const getLeadsByUser = async (userId: string) => {
  try {
    // OPTIMIZED: Use static populations array instead of 8 separate exists() queries
    const leads = await Lead.find({ assigned_to: userId })
      .sort({ createdAt: -1 })
      .populate(LEAD_POPULATIONS)
      .lean();

    if (!leads || leads.length === 0) {
      return { message: "No leads found for this user", leads: [], total: 0 };
    }

    return { 
      message: "Leads fetched successfully", 
      leads,
      total: leads.length 
    };
  } catch (error: any) {
    console.error("Error fetching getLeadsByUser:", error.message);
    return {
      error: "Failed to fetch My Leads",
      details: error.message,
      leads: [],
      total: 0,
    };
  }
};

export const updateLeadStatus = async (
  leadId: string,
  newStatus: string,
  additionalData?: {
    conversionValue?: number;
    followUpDate?: string;
    contactTypes?: ("email" | "call" | "chat")[];
    followUpNote?: string;
    note?: string;
    userId?: string;
  }
) => {
  try {
    // Get the lead first to check follow-up dates
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    // Store old status for notification
    const oldStatus = lead.status || "Pending";
    const oldResolveStatus = lead.resolve_status || "Pending";

    const updateData: any = { status: newStatus };

    // Handle specific status updates
    if (newStatus === "Converted" && additionalData?.conversionValue) {
      updateData.resolve_status = "Converted";
      updateData.resolved = true;
      updateData.resolvedAt = new Date();
      updateData.conversion_value = additionalData.conversionValue;
    }

    // Handle all types of follow-up statuses
    if (
      (newStatus === "Follow Up" ||
        newStatus === "Follow Up 1" ||
        newStatus === "Follow Up 2" ||
        newStatus === "Follow Up 3") &&
      additionalData?.followUpDate
    ) {
      // Create new follow-up entry
      const newFollowUp = {
        date: new Date(additionalData.followUpDate),
        contact_type: additionalData.contactTypes || ["email"],
        notes: additionalData.followUpNote || "",
      };

      // Validate follow-up date - must be later than any previous follow-up
      if (
        lead.next_follow_up &&
        Array.isArray(lead.next_follow_up) &&
        lead.next_follow_up.length > 0
      ) {
        const previousFollowUps = [...lead.next_follow_up].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestFollowUpDate = new Date(previousFollowUps[0].date);
        const newFollowUpDate = new Date(additionalData.followUpDate);

        if (newFollowUpDate.getTime() <= latestFollowUpDate.getTime()) {
          return {
            error: true,
            message:
              "New follow-up date must be later than previous follow-up dates",
          };
        }
      }

      // Add new follow-up to the array
      updateData.next_follow_up = lead.next_follow_up || [];
      updateData.next_follow_up.push(newFollowUp);
    }

    if (["Resolved", "Order Assigned", "Paid"].includes(newStatus)) {
      updateData.status = "Closed";
      updateData.resolved = true;
      updateData.resolvedAt = new Date();
      updateData.resolve_status = newStatus;
    }

    // Add note if provided
    if (additionalData?.note && additionalData?.userId) {
      const newNote = {
        text: additionalData.note,
        created_at: new Date(),
        created_by: additionalData.userId,
      };

      // Check if notes field exists and is an array
      if (!lead.notes || !Array.isArray(lead.notes)) {
        updateData.notes = [newNote];
      } else {
        updateData.notes = [...lead.notes, newNote];
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      { _id: leadId },
      updateData,
      { new: true }
    );

    // Create notification for status change if we have userId
    if (updatedLead && additionalData?.userId) {
      // Note: This is async but we don't wait for it to complete
      createStatusChangeNotification(
        updatedLead,
        oldStatus,
        newStatus,
        additionalData.userId,
        {
          conversion_value: additionalData.conversionValue,
          follow_up_date: additionalData.followUpDate
            ? new Date(additionalData.followUpDate)
            : undefined,
          contact_types: additionalData.contactTypes,
          note: additionalData.note,
        }
      );

      // Emit socket event for status change - only on server
      if (socketServer && updatedLead) {
        socketServer.emitLeadStatusChanged(updatedLead);
      }
    }

    return updatedLead;
  } catch (error) {
    console.error("Error updating lead status:", error);
    return null;
  }
};

export const createCustomLead = async (
  customLeadData: Partial<ICustomLead>,
  createdById?: string
) => {
  try {
    // First, create the CustomLead document
    const customLead = new CustomLead({
      firstName: customLeadData.firstName,
      lastName: customLeadData.lastName,
      email: customLeadData.email,
      contactNo: customLeadData.contactNo,
      domain: customLeadData.domain,
      supportType: customLeadData.supportType,
      customerQuery: customLeadData.customerQuery || "",
      coursesInterested: customLeadData.coursesInterested || [],
    });

    await customLead.save();

    // Then, create the Lead document with reference to the CustomLead
    const lead = new Lead({
      category: "Custom Lead",
      custom_lead: customLead._id,
      contact_us: null,
      scholarship: null,
      free_signup: null,
      abandoned_cart: null,
      order_creation: null,
      email: customLeadData.email ,
      fullname: `${customLeadData.firstName} ${customLeadData.lastName}`.trim(),
      contactNo: customLeadData.contactNo,
      status: "Follow Up",
      resolve_status: "Pending",
      assigned: false,
      assigned_to: null,
      created_by: createdById,
      domain: customLeadData.domain,
      next_follow_up: null,
      notes: [],
      conversion_value: null,
    });

    await lead.save();

    createNewLeadNotification(lead);

    // Populate the custom_lead field to return complete data
    const populatedLead = await Lead.findById(lead._id).populate([
      "custom_lead",
      { path: "assigned_to", model: "User", select: "full_name user_name" }
    ]);

    return {
      success: true,
      message: "Custom lead created successfully",
      lead: populatedLead,
    };
  } catch (error: any) {
    console.error("Error creating custom lead:", error);
    return {
      success: false,
      message: "Failed to create custom lead",
      error: error.message,
    };
  }
};

// Function to handle lead assignment
export const assignLeadToUser = async (leadId: string, userId: string, userType?: number) => {
  try {
    // First, check if the lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return {
        success: false,
        message: "Lead not found",
      };
    }

    // Check if lead is already assigned - only block reassignment for regular users (type 3)
    if (lead.assigned && userType === 3) {
      return {
        success: false,
        message: "This lead is already assigned to another user",
        isAlreadyAssigned: true,
      };
    }

    // Update the lead with assignment information
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        assigned_to: userId,
        assigned: true,
        assignedAt: new Date(),
        status: lead.status || "Pending",
      },
      { new: true }
    ).populate("assigned_to", "full_name user_name");

    if (!updatedLead) {
      return {
        success: false,
        message: "Failed to assign lead",
      };
    }

    // Create notification for lead assignment
    createLeadAssignedNotification(updatedLead, userId);

    // Emit socket event for lead assignment - only on server
    if (socketServer) {
      socketServer.emitLeadAssigned(updatedLead);
    }

    return {
      success: true,
      message: "Lead assigned successfully",
      lead: updatedLead,
    };
  } catch (error) {
    console.error("Error assigning lead:", error);
    return {
      success: false,
      message: "Failed to assign lead",
    };
  }
};

export const deleteLead = async (
  leadId: string,
  userId: string,
  userType: number
) => {
  try {
    if (userType === 3) {
      return {
        success: false,
        message: "You don't have permission to delete leads",
      };
    }

    // First, get the lead to see what associated records need to be deleted
    const lead = await Lead.findById(leadId);

    if (!lead) {
      return {
        success: false,
        message: "Lead not found",
      };
    }

    // Import the models for deletion (dynamic imports to avoid circular dependencies)
    const { default: Contact } = await import("@/models/contact");
    const { default: Customer } = await import("@/models/customer");
    const { default: AbandonedCart } = await import("@/models/abandonedCart");
    const { default: OrderCreation } = await import("@/models/orders");
    const { default: CustomLead } = await import("@/models/customLead");
    const { default: Scholarship } = await import("@/models/scholarship");
    const { default: Invoice } = await import("@/models/invoice");

    // Delete associated records based on lead type
    const deletionPromises = [];

    if (lead.contact_us) {
      deletionPromises.push(Contact.findByIdAndDelete(lead.contact_us));
    }

    if (lead.free_signup) {
      deletionPromises.push(Customer.findByIdAndDelete(lead.free_signup));
    }

    if (lead.abandoned_cart) {
      deletionPromises.push(AbandonedCart.findByIdAndDelete(lead.abandoned_cart));
    }

    if (lead.order_creation) {
      deletionPromises.push(OrderCreation.findByIdAndDelete(lead.order_creation));
      console.log(`Deleting order record: ${lead.order_creation}`);
    }

    if (lead.custom_lead) {
      deletionPromises.push(CustomLead.findByIdAndDelete(lead.custom_lead));
      // console.log(`Deleting custom lead record: ${lead.custom_lead}`);
    }

    if (lead.scholarship) {
      deletionPromises.push(Scholarship.findByIdAndDelete(lead.scholarship));
    }

    if (lead.invoice) {
      deletionPromises.push(Invoice.findByIdAndDelete(lead.invoice));
      console.log(`Deleting invoice record: ${lead.invoice}`);
    }

    // Execute all deletions in parallel
    await Promise.all(deletionPromises);

    // Finally, delete the lead itself
    const result = await Lead.findByIdAndDelete(leadId);

    if (!result) {
      return {
        success: false,
        message: "Failed to delete lead",
      };
    }
    // Emit socket event for lead deletion - only on server
    if (socketServer) {
      socketServer.emitLeadDeleted(leadId);
    }

    return {
      success: true,
      message: "Lead and all associated records deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return {
      success: false,
      message: "Failed to delete lead",
    };
  }
};

export const batchDeleteLeads = async (
  leadIds: string[],
  userId: string,
  userType: number
) => {
  try {
    // Check if the user is authorized to delete leads (userType != 3)
    if (userType === 3) {
      return {
        success: false,
        message: "You don't have permission to delete leads",
      };
    }

    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        message: "No lead IDs provided",
      };
    }

    // Get all leads to see what associated records need to be deleted
    const leads = await Lead.find({ _id: { $in: leadIds } });

    if (leads.length === 0) {
      return {
        success: false,
        message: "No leads found",
      };
    }

    // Import the models for deletion
    const { default: Contact } = await import("@/models/contact");
    const { default: Customer } = await import("@/models/customer");
    const { default: AbandonedCart } = await import("@/models/abandonedCart");
    const { default: OrderCreation } = await import("@/models/orders");
    const { default: CustomLead } = await import("@/models/customLead");
    const { default: Scholarship } = await import("@/models/scholarship");

    // Collect all associated record IDs for bulk deletion
    const contactIds: string[] = [];
    const customerIds: string[] = [];
    const abandonedCartIds: string[] = [];
    const orderIds: string[] = [];
    const customLeadIds: string[] = [];
    const scholarshipIds: string[] = [];

    leads.forEach(lead => {
      if (lead.contact_us) contactIds.push(lead.contact_us.toString());
      if (lead.free_signup) customerIds.push(lead.free_signup.toString());
      if (lead.abandoned_cart) abandonedCartIds.push(lead.abandoned_cart.toString());
      if (lead.order_creation) orderIds.push(lead.order_creation.toString());
      if (lead.custom_lead) customLeadIds.push(lead.custom_lead.toString());
      if (lead.scholarship) scholarshipIds.push(lead.scholarship.toString());
    });

    // Execute bulk deletions in parallel
    const deletionPromises = [];

    if (contactIds.length > 0) {
      deletionPromises.push(Contact.deleteMany({ _id: { $in: contactIds } }));
    }

    if (customerIds.length > 0) {
      deletionPromises.push(Customer.deleteMany({ _id: { $in: customerIds } }));
    }

    if (abandonedCartIds.length > 0) {
      deletionPromises.push(AbandonedCart.deleteMany({ _id: { $in: abandonedCartIds } }));
    }

    if (orderIds.length > 0) {
      deletionPromises.push(OrderCreation.deleteMany({ _id: { $in: orderIds } }));
      console.log(`Deleting ${orderIds.length} order records`);
    }

    if (customLeadIds.length > 0) {
      deletionPromises.push(CustomLead.deleteMany({ _id: { $in: customLeadIds } }));
    }

    if (scholarshipIds.length > 0) {
      deletionPromises.push(Scholarship.deleteMany({ _id: { $in: scholarshipIds } }));
    }

    // Execute all associated record deletions
    await Promise.all(deletionPromises);

    // Finally, delete all leads
    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    console.log(`Batch deleted ${result.deletedCount} leads and all associated records`);

    // Emit socket events for lead deletions - only on server
    if (socketServer) {
      leadIds.forEach(leadId => {
        socketServer.emitLeadDeleted(leadId);
      });
    }

    return {
      success: true,
      message: `${result.deletedCount} leads and all associated records deleted successfully`,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error("Error batch deleting leads:", error);
    return {
      success: false,
      message: "Failed to delete leads",
    };
  }
};

export const getLeadHistory = async (email: string, domain: string) => {
  try {
    await connectDB();

    // Build the query to find leads with the same email and domain
    const query: any = {
      domain: domain,
      email: email, // Use direct email field
    };

    // Fetch leads with the same email and domain
    const leads = await Lead.find(query)
      .populate([
        "contact_us",
        "free_signup", 
        "order_creation",
        "abandoned_cart",
        "scholarship",
        "custom_lead",
        { path: "assigned_to", model: "User", select: "full_name user_name" }
      ])
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();

    return {
      success: true,
      leads: leads,
      count: leads.length,
    };

  } catch (error) {
    console.error("Error fetching lead history:", error);
    return {
      success: false,
      message: "Failed to fetch lead history",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getLeadById = async (leadId: string) => {
  try {
    await connectDB();

    if (!leadId) {
      return {
        success: false,
        message: "Lead ID is required",
      };
    }

    // Fetch the lead with all populated fields
    const lead = await Lead.findById(leadId)
      .populate([
        "contact_us",
        "free_signup",
        "order_creation",
        "abandoned_cart",
        "scholarship",
        "custom_lead",
        { path: "assigned_to", model: "User", select: "full_name user_name" }
      ])
      .lean();

    if (!lead) {
      return {
        success: false,
        message: "Lead not found",
      };
    }

    return {
      success: true,
      lead: lead,
    };

  } catch (error) {
    console.error("Error fetching lead:", error);
    return {
      success: false,
      message: "Failed to fetch lead",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
