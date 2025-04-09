import Lead from "@/models/lead";
import { ILead } from "@/types/leads";
import CustomLead, { ICustomLead } from "@/models/customLead";
import mongoose from "mongoose";
import { 
  createNewLeadNotification, 
  createLeadAssignedNotification, 
  createStatusChangeNotification 
} from "@/services/notificationService";

// Reusability:
// Agar aapko similar logic multiple jagah pe chahiye ho, toh aap controller functions ko import karke reuse kar sakte hain.

export const getAllLeads = async () => {
  // console.log("Inside getAllLeads function");
  try {
    const populations = [];
    if (await Lead.exists({ free_signup: { $ne: null } })) {
      populations.push({ path: "free_signup", model: "Customer" });
    }
    if (await Lead.exists({ contact_us: { $ne: null } })) {
      populations.push({ path: "contact_us", model: "Contact" });
    }
    if (await Lead.exists({ abandoned_cart: { $ne: null } })) {
      populations.push({ path: "abandoned_cart", model: "AbandonedCart" });
    }
    if (await Lead.exists({ scholarship: { $ne: null } })) {
      populations.push({ path: "scholarship", model: "Scholarship" });
    }
    if (await Lead.exists({ order_creation: { $ne: null } })) {
      populations.push({ path: "order_creation", model: "OrderCreation" });
    }
    if (await Lead.exists({ custom_lead: { $ne: null } })) {
      populations.push({ path: "custom_lead", model: "CustomLead" });
    }
    // Add assigned_to population
    populations.push({ path: "assigned_to", model: "User", select: "full_name user_name" });

    const leads = await Lead.find()
      .sort({ createdAt: -1 })
      .populate(populations);

    if (!leads || leads.length === 0) {
      return { message: "No leads found", leads: [] };
    }
    // console.log("Lead: ", leads[leads.length - 2]);
    return { message: "All leads fetched successfully", leads };
  } catch (error: any) {
    console.error("Error caught: ", error)
    return { error: "Failed to fetch leads", details: error.message, leads: [] };
  }
};

export const createLead = async (
  ids: string[],
  requestBody: Partial<ILead>
) => {
  const {
    category,
    contact_us,
    scholarship,
    free_signup,
    abandoned_cart,
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
      message: "Category, Domain, and assigned status are required.",
    };
  }

  const newLead = new Lead({
    category,
    contact_us: contact_us || null,
    scholarship: scholarship || null,
    free_signup: free_signup || null,
    abandoned_cart: abandoned_cart || null,
    status: status || "Pending",
    resolve_status: resolve_status || "Pending",
    assigned,
    assigned_to: assigned_to || null,
    created_by: created_by,
    domain,
    next_follow_up,
    conversion_value,
    notes: [],
  });

  // Function to get random category
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
        _id: { $in: Object.values(result.insertedIds).map(id => id) }
      });
      
      // Create notification for each lead
      for (const lead of newLeads) {
        createNewLeadNotification(lead);
      }
    }
    
    return {
      message: "Leads created successfully",
      insertedCount: result.insertedCount,
    };
  } catch (error: any) {
    if (error.cause) {
      console.error("Cause of error:", error.cause);
    }
    return { message: "Error creating lead", error: error.message };
  }
};

export const getLeadsByUser = async (userId: string) => {
  try {
    // console.log("UserId: ", userId);
    const populations = [];
    if (await Lead.exists({ free_signup: { $ne: null } })) {
      populations.push({ path: "free_signup", model: "Customer" });
    }
    if (await Lead.exists({ contact_us: { $ne: null } })) {
      populations.push({ path: "contact_us", model: "Contact" });
    }
    if (await Lead.exists({ abandoned_cart: { $ne: null } })) {
      populations.push({ path: "abandoned_cart", model: "AbandonedCart" });
    }
    if (await Lead.exists({ scholarship: { $ne: null } })) {
      populations.push({ path: "scholarship", model: "Scholarship" });
    }
    if (await Lead.exists({ order_creation: { $ne: null } })) {
      populations.push({ path: "order_creation", model: "OrderCreation" });
    }
    if (await Lead.exists({ custom_lead: { $ne: null } })) {
      populations.push({ path: "custom_lead", model: "CustomLead" });
    }

    const leads = await Lead.find({
      assigned_to: userId,
    }).populate(populations);

    if (!leads || leads.length === 0) {
      return { message: "No leads found for this user", leads: [] };
    }
    // console.log("User Leads: ",leads);

    return { message: "Leads fetched successfully", leads };
  } catch (error: any) {
    console.error("Error fetching getLeadsByUser", error);
    return { error: "Failed to fetch My Leads", details: error.message, leads: [] };
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

    const updateData: any = { status: newStatus };

    // Handle specific status updates
    if (newStatus === "Converted" && additionalData?.conversionValue) {
      updateData.resolve_status = "Converted";
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
      if (lead.next_follow_up && Array.isArray(lead.next_follow_up) && lead.next_follow_up.length > 0) {
        const previousFollowUps = [...lead.next_follow_up].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestFollowUpDate = new Date(previousFollowUps[0].date);
        const newFollowUpDate = new Date(additionalData.followUpDate);
        
        if (newFollowUpDate.getTime() <= latestFollowUpDate.getTime()) {
          return { 
            error: true, 
            message: "New follow-up date must be later than previous follow-up dates"
          };
        }
      }

      // Add new follow-up to the array
      updateData.next_follow_up = lead.next_follow_up || [];
      updateData.next_follow_up.push(newFollowUp);
    }

    if (newStatus === "Resolved") {
      updateData.resolved = true;
      updateData.resolvedAt = new Date();
      updateData.resolve_status = "Resolved";
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
          follow_up_date: additionalData.followUpDate ? new Date(additionalData.followUpDate) : undefined,
          contact_types: additionalData.contactTypes,
          note: additionalData.note,
        }
      );
    }

    return updatedLead;
  } catch (error) {
    console.error("Error updating lead status:", error);
    return null;
  }
};

export const createCustomLead = async (customLeadData: Partial<ICustomLead>, createdById?: string) => {
  try {
    // First, create the CustomLead document
    const customLead = new CustomLead({
      firstName: customLeadData.firstName,
      lastName: customLeadData.lastName,
      email: customLeadData.email,
      contactNo: customLeadData.contactNo,
      domain: customLeadData.domain,
      supportType: customLeadData.supportType,
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
      status: "Follow Up",
      resolve_status: "Pending",
      assigned: false, 
      assigned_to: null,
      created_by: createdById || new mongoose.Types.ObjectId("67b33a327fa1571a2f0e1e4b"),
      domain: customLeadData.domain,
      next_follow_up: null,
      notes: [],
      conversion_value: null,
    });

    await lead.save();

    createNewLeadNotification(lead);

    // Populate the custom_lead field to return complete data
    const populatedLead = await Lead.findById(lead._id).populate("custom_lead");

    return {
      success: true,
      message: "Custom lead created successfully",
      lead: populatedLead
    };
  } catch (error: any) {
    console.error("Error creating custom lead:", error);
    return {
      success: false,
      message: "Failed to create custom lead",
      error: error.message
    };
  }
};

// Function to handle lead assignment
export const assignLeadToUser = async (leadId: string, userId: string) => {
  try {
    // First, check if the lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return {
        success: false,
        message: "Lead not found"
      };
    }

    // Update the lead with assignment information
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        assigned_to: userId,
        assigned: true,
        assignedAt: new Date()
      },
      { new: true }
    );

    if (!updatedLead) {
      return {
        success: false,
        message: "Failed to assign lead"
      };
    }

    // Create notification for lead assignment
    createLeadAssignedNotification(updatedLead, userId);

    return {
      success: true,
      message: "Lead assigned successfully",
      lead: updatedLead
    };
  } catch (error) {
    console.error("Error assigning lead:", error);
    return {
      success: false,
      message: "Failed to assign lead"
    };
  }
};

export const deleteLead = async (leadId: string, userId: string, userType: number) => {
  try {
    // Check if the user is authorized to delete leads (userType != 3)
    if (userType === 3) {
      return {
        success: false,
        message: "You don't have permission to delete leads"
      };
    }

    // Delete the lead
    const result = await Lead.findByIdAndDelete(leadId);
    
    if (!result) {
      return {
        success: false,
        message: "Lead not found"
      };
    }

    return {
      success: true,
      message: "Lead deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return {
      success: false,
      message: "Failed to delete lead"
    };
  }
};