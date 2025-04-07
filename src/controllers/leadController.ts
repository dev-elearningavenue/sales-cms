import Lead from "@/models/lead";
import { ILead } from "@/types/leads";
import CustomLead, { ICustomLead } from "@/models/customLead";
import mongoose from "mongoose";

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
    conversionValue?: number, 
    followUpDate?: Date,
    contactTypes?: string[],
    followUpNote?: string,
    note?: string,
    userId?: string
  }
) => {
  try {
    // Get the lead first to check follow-up dates
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    const updateData: any = { status: newStatus };

    // Handle specific status updates
    if (newStatus === "Converted" && additionalData?.conversionValue) {
      updateData.resolve_status = "Converted";
      updateData.conversion_value = additionalData.conversionValue;
    } 
    
    if (newStatus === "Follow Up" && additionalData?.followUpDate) {
      // Create new follow-up entry
      const newFollowUp = {
        date: additionalData.followUpDate,
        contact_type: additionalData.contactTypes || ["email"],
        notes: additionalData.followUpNote || ""
      };
      
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
        created_by: additionalData.userId
      };
      
      // Check if notes field exists and is an array
      if (!lead.notes || !Array.isArray(lead.notes)) {
        updateData.notes = [newNote];
      } else {
        updateData.notes = [...lead.notes, newNote];
      }
    }

    return await Lead.findByIdAndUpdate(
      { _id: leadId },
      updateData,
      { new: true }
    );
  } catch (error) {
    console.error("Error updating lead status:", error);
    return null;
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
      assigned: false, // Not auto-assigned
      assigned_to: null, // No assignee initially
      created_by: createdById || new mongoose.Types.ObjectId("67b33a327fa1571a2f0e1e4b"),
      domain: customLeadData.domain,
      next_follow_up_date: null,
      conversion_value: null,
    });

    await lead.save();

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
