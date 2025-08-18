import OrderCreation from "@/models/orders";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";
import { getLeadDetails } from "@/lib/mongoListener";
import { ObjectId } from "mongodb";

export const createOrder = async (orderData: any) => {
  try {
    // Validate required fields
    if (!orderData.domain) {
      return {
        success: false,
        error: "Domain is required for order creation",
      };
    }
    const newOrder = new OrderCreation(orderData);
    const savedOrder = await newOrder.save();

    if (!savedOrder) {
      return {
        success: false,
        error: "Failed to create order",
      };
    }

    // const totalOrderPrice = orderData.items?.reduce((total: number, item: any) => {
    //   const price = parseFloat(item.price) || 0;
    //   return total + (price * (item.quantity || 1));
    // }, 0) || 0;

    const totalOrderPrice = orderData.total_order_price;
    if (totalOrderPrice === 0) {
      return {
        success: true,
        message: "Unpaid Trainings skipped successfully",
      };
    }
    const orderType = "Order Creation";
    // console.log("Order Type: ", orderType, " ", totalOrderPrice);
    // Use getLeadDetails function for consistent lead creation
    const { category, leadFields, formattedDomain } = getLeadDetails(
      orderType,
      new ObjectId(savedOrder._id),
      orderData.domain
    );

    // Extract user details from order data
    const email = orderData.email || orderData.customerEmail || null;
    const fullName = orderData.customerName || orderData.name || orderData.fullName || null;
    const contactNo = orderData.contactNo || orderData.phone || orderData.customerPhone || null;

    // Create corresponding lead with proper category and formatting
    const leadData = new Lead({
      category: category,
      ...leadFields,
      email: email,
      fullname: fullName,
      contactNo: contactNo,
      domain: formattedDomain,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      next_follow_up: null,
      notes: [],
    });

    const leadResult = await leadData.save();

    createNewLeadNotification(leadResult);

    return {
      success: true,
      message: "Order and lead created successfully",
      data: {
        order: savedOrder,
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

export const getAllOrders = async (options?: {
  limit?: number;
  skip?: number;
  domain?: string;
}) => {
  try {
    // Build query filter
    let query = {};
    if (options?.domain) {
      query = { domain: options.domain };
    }

    // Execute query with optional pagination
    let queryBuilder = OrderCreation.find(query).sort({ createdAt: -1 });
    
    if (options?.skip) {
      queryBuilder = queryBuilder.skip(options.skip);
    }
    
    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    const orders = await queryBuilder.exec();
    const total = await OrderCreation.countDocuments(query);

    return {
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders,
        total,
        showing: orders.length,
        hasMore: options?.limit && options?.skip 
          ? total > options.skip + options.limit 
          : false,
      },
    };

  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      error: "Failed to fetch orders",
      message: error.message,
    };
  }
};

export const getOrderById = async (orderId: string) => {
  try {
    const order = await OrderCreation.findById(orderId);
    
    if (!order) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    return {
      success: true,
      message: "Order fetched successfully",
      data: { order },
    };

  } catch (error: any) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      error: "Failed to fetch order",
      message: error.message,
    };
  }
}; 