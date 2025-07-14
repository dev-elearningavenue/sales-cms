import shortCourseDiscount from "@/models/shortCourseDiscount";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";
import { getLeadDetails } from "@/lib/mongoListener";
import { ObjectId } from "mongodb";

export const creatediscountQuery = async (discountQuery: any) => {
  try {

    const newDiscountQuery = new shortCourseDiscount(discountQuery);
    const savedDiscountQuery = await newDiscountQuery.save();

    if (!savedDiscountQuery) {
      return {
        success: false,
        error: "Failed to create Short courses group discount query",
      };
    }

    const { category, leadFields, formattedDomain } = getLeadDetails(
      'SC Group Discount',
      new ObjectId(savedDiscountQuery._id),
      String(discountQuery.domain)
    );

    // Create corresponding lead with proper category and formatting
    const leadData = new Lead({
      category: category,
      ...leadFields,
      domain: formattedDomain,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      next_follow_up: null,
      notes: [],
      conversion_value: null,
    });

    const leadResult = await leadData.save();

    // Create notification for new lead
    createNewLeadNotification(leadResult);

    return {
      success: true,
      message: "Short courses group discount query and lead created successfully",
      data: {
        discountQuery: savedDiscountQuery,
        lead: leadResult,
      },
    };

  } catch (error: any) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: "Failed to create order",
      message: error.message,
    };
  }
};