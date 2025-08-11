import AbandonedCart from "@/models/abandonedCart";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";
import { getLeadDetails } from "@/lib/mongoListener";
import { ObjectId } from "mongodb";
import connectDB from "@/lib/db";

// Create RAC (Abandoned Cart) and corresponding Lead
export const createRac = async (racData: any) => {
  try {
    // Validate required fields
    if (!racData.domain) {
      return {
        success: false,
        error: "Domain is required for abandoned cart creation",
      };
    }
    
    if (!racData.email) {
      return {
        success: false,
        error: "Email is required for abandoned cart creation",
      };
    }
    
    if (!racData.order_id) {
      return {
        success: false,
        error: "Order ID is required for abandoned cart creation",
      };
    }
    
    // Check if order_id already exists
    const existingCart = await AbandonedCart.findOne({ domain: "Free Osha Courses - FOC", order_id: racData.order_id });
    if (existingCart) {
      return {
        success: false,
        error: "Abandoned cart with this order ID already exists",
        existing_id: existingCart._id,
      };
    }
    
    // Insert into AbandonedCart
    const newAbandonedCart = new AbandonedCart(racData);
    const savedAbandonedCart = await newAbandonedCart.save();

    if (!savedAbandonedCart) {
      return {
        success: false,
        error: "Failed to create abandoned cart",
      };
    }

    const { category, leadFields, formattedDomain } = getLeadDetails(
      "Abandoned Cart",
      new ObjectId(savedAbandonedCart._id),
      racData.domain
    );

    // Extract user details from abandoned cart data
    const email = racData.email || null;
    const fullName = racData.customerName || racData.name || racData.fullName || null;
    const contactNo = racData.contactNo || racData.phone || racData.customerPhone || null;

    // Create corresponding lead
    const leadData = new Lead({
      category: category,
      ...leadFields,
      email: email,
      fullname: fullName,
      contactNo: contactNo,
      domain: formattedDomain,
      abandoned_cart: savedAbandonedCart._id,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      notes: [],
      next_follow_up: null,
      conversion_value: null,
    });
    const leadResult = await leadData.save();

    // Create notification (non-blocking - don't fail if notification fails)
    try {
      await createNewLeadNotification(leadResult);
    } catch (notificationError) {
      console.warn("Failed to create notification for lead:", leadResult._id, notificationError);
    }
    
    return {
      success: true,
      message: "Abandoned cart and lead created successfully",
      data: {
        abandonedCart: savedAbandonedCart,
        lead: leadResult,
      },
    };
  } catch (error: any) {
    console.error("Error creating abandoned cart:", error.message);
    return {
      success: false,
      error: "Failed to create abandoned cart",
      message: error.message,
    };
  }
};
