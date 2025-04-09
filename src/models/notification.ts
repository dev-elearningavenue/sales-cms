import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  type: string;
  message: string;
  lead?: mongoose.Types.ObjectId;
  from_user?: mongoose.Types.ObjectId;
  to_users: mongoose.Types.ObjectId[];
  read_by: mongoose.Types.ObjectId[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "new_lead",
        "lead_status_changed",
        "lead_resolved",
        "lead_converted",
        "order_created",
        "follow_up_added",
        "lead_assigned",
        "lead_deleted",
        "batch_assign",
        "batch_delete",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
    from_user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    to_users: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
    },
    read_by: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Create indexes for better query performance
notificationSchema.index({ to_users: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema); 