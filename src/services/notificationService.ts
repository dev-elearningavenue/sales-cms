import { ILead } from "@/types/leads";
import mongoose from "mongoose";
import Notification from "@/models/notification";
import User from "@/models/user";

type UserIdType = string | mongoose.Types.ObjectId;

export async function createNewLeadNotification(lead: ILead) {
  try {
    const allUsers = await User.find({});
    
    const notificationData = new Notification( {
      type: "new_lead",
      lead: lead._id,
      to_users: allUsers.map(user => user._id),
      message: `New lead received from ${lead.domain} - ${lead.category}`,
      metadata: {
        lead_category: lead.category,
        lead_domain: lead.domain,
        status: lead.status,
      }
    });
    await notificationData.save();
    // console.log("🔔 Notification created successfully with ID:", savedNotification._id);
    
    return true;
  } catch (error) {
    console.error("❌ Error creating new lead notification:", error);
    return false;
  }
}

export async function createLeadAssignedNotification(lead: ILead, assignedById: UserIdType) {
  try {
    // Get the user who assigned the lead
    const assignedBy = await User.findById(assignedById);
    if (!assignedBy) return false;
    
    const toUsers = [assignedBy._id];
    
    // If assigned by type 3 user, notify type 1 and 2 users
    if (assignedBy.user_type === 3) {
      const adminUsers = await User.find({ user_type: { $in: [1, 2] } });
      toUsers.push(...adminUsers.map(user => user._id));
    }

    await Notification.create({
      type: "lead_assigned",
      lead: lead._id,
      from_user: assignedBy._id,
      to_users: toUsers,
      message: `Lead assigned to ${assignedBy.full_name || assignedBy.user_name}`,
      metadata: {
        lead_category: lead.category,
        lead_domain: lead.domain,
        assigned_at: new Date(),
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error creating lead assigned notification:", error);
    return false;
  }
}

export async function createStatusChangeNotification(
  lead: ILead,
  oldStatus: string,
  newStatus: string,
  changedById: UserIdType,
  metadata?: {
    conversion_value?: number;
    follow_up_date?: Date;
    contact_types?: string[];
    note?: string;
  }
) {
  try {
    // Get the user who changed the status
    const changedBy = await User.findById(changedById);
    if (!changedBy) return false;
    
    const toUsers = [changedBy._id];
    
    // If status changed by type 3 user, notify type 1 and 2 users
    if (changedBy.user_type === 3) {
      const adminUsers = await User.find({ user_type: { $in: [1, 2] } });
      toUsers.push(...adminUsers.map(user => user._id));
    }

    let type: "lead_status_changed" | "lead_resolved" | "lead_converted" | "follow_up_added" = "lead_status_changed";
    let message = `Lead status changed from ${oldStatus} to ${newStatus}`;

    if (newStatus === "Resolved") {
      type = "lead_resolved";
      message = `Lead marked as resolved by ${changedBy.full_name || changedBy.user_name}`;
    } else if (newStatus === "Converted") {
      type = "lead_converted";
      message = `Lead converted by ${changedBy.full_name || changedBy.user_name}`;
      if (metadata?.conversion_value) {
        message += ` with value $${metadata.conversion_value}`;
      }
    } else if (newStatus === "Follow Up") {
      type = "follow_up_added";
      message = `Follow-up scheduled by ${changedBy.full_name || changedBy.user_name}`;
      if (metadata?.follow_up_date) {
        const date = new Date(metadata.follow_up_date);
        message += ` for ${date.toLocaleDateString()}`;
      }
    }

    await Notification.create({
      type,
      lead: lead._id,
      from_user: changedBy._id,
      to_users: toUsers,
      message,
      metadata: {
        lead_category: lead.category,
        lead_domain: lead.domain,
        old_status: oldStatus,
        new_status: newStatus,
        ...metadata,
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error creating status change notification:", error);
    return false;
  }
}

export async function createBatchActionNotification(
  action: "batch_assign" | "batch_delete",
  leadIds: string[],
  userId: UserIdType,
  count: number
) {
  try {
    const user = await User.findById(userId);
    if (!user) return false;
    
    const toUsers = [user._id];
    
    // If action by type 3 user, notify type 1 and 2 users
    if (user.user_type === 3) {
      const adminUsers = await User.find({ user_type: { $in: [1, 2] } });
      toUsers.push(...adminUsers.map(admin => admin._id));
    }

    const message = action === "batch_assign" 
      ? `${count} leads assigned to ${user.full_name || user.user_name}`
      : `${count} leads deleted by ${user.full_name || user.user_name}`;

    await Notification.create({
      type: action,
      from_user: user._id,
      to_users: toUsers,
      message,
      metadata: {
        lead_ids: leadIds,
        count
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Error creating ${action} notification:`, error);
    return false;
  }
}

export async function getUserNotifications(userId: UserIdType, limit = 50) {
  try {
    return await Notification.find({
      to_users: userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("lead", "category domain status")
      .populate("from_user", "full_name user_name")
      .lean();
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string, userId: UserIdType) {
  try {
    await Notification.findByIdAndUpdate(
      notificationId,
      {
        $addToSet: { read_by: userId }
      }
    );
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: UserIdType) {
  try {
    await Notification.updateMany(
      { 
        to_users: userId,
        read_by: { $ne: userId }
      },
      {
        $addToSet: { read_by: userId }
      }
    );
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

export async function getUnreadNotificationCount(userId: UserIdType) {
  try {
    return await Notification.countDocuments({
      to_users: userId,
      read_by: { $ne: userId }
    });
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return 0;
  }
}

// Debug function to check notification records
export async function checkNotifications() {
  try {
    // Count total notifications
    const totalCount = await Notification.countDocuments({});
    
    // Count by type
    const typeCounts = await Notification.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent notifications
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("lead", "category domain status")
      .populate("to_users", "full_name user_name");
    
    return {
      total: totalCount,
      byType: typeCounts,
      recent: recentNotifications
    };
  } catch (error) {
    console.error("Error checking notifications:", error);
    return { error: "Failed to check notifications" };
  }
} 

export async function createInvoicePaymentNotification(invoice: any) {
  try {
    // Get users to notify: invoice creator + all users except userType 3
    const toUsers: string[] = [];
    
    if (invoice.agentId) {
      toUsers.push(invoice.agentId.toString());
    }
    
    const adminUsers = await User.find({ user_type: { $ne: 3 } });
    adminUsers.forEach((user: any) => {
      if (!toUsers.includes(user._id.toString())) {
        toUsers.push(user._id.toString());
      }
    });
    
    if (toUsers.length === 0) {
      return true;
    }
    
    await Notification.create({
      type: "invoice_paid",
      to_users: toUsers,
      message: `Invoice of $${invoice.totalPrice} has been paid by ${invoice.customerEmail} - ${invoice.invoiceNumber}`,
      metadata: {
        invoice_number: invoice.invoiceNumber,
        customer_email: invoice.customerEmail,
        paid_at: invoice.paidAt,
        amount: invoice.totalPrice,
        site_name: invoice.siteName,
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error creating invoice payment notification:", error);
    return false;
  }
} 