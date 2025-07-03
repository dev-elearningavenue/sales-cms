import OrderCreation from "@/models/orders";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";

export const createOrder = async (orderData: any) => {
  try {
    // Validate required fields
    if (!orderData.domain) {
      return {
        success: false,
        error: "Domain is required for order creation",
      };
    }

    // Create the order in paidorders collection
    const newOrder = new OrderCreation(orderData);
    const savedOrder = await newOrder.save();

    if (!savedOrder) {
      return {
        success: false,
        error: "Failed to create order",
      };
    }

    // Create corresponding lead with "Order Creation" category
    const leadData = new Lead({
      category: "Order Creation",
      order_creation: savedOrder._id,
      domain: orderData.domain,
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