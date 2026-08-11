import StickySignup from "@/models/stickySignup";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";
import { getLeadDetails } from "@/lib/mongoListener";
import { ObjectId } from "mongodb";

let socketServer:
  | {
      emitNewLead: (lead: any) => void;
    }
  | undefined;

if (typeof window === "undefined") {
  try {
    socketServer = require("../../server/socketServer");
  } catch {
    // optional in API-only contexts
  }
}

export const createStickySignup = async (signupData: {
  originId: string;
  email: string;
  phone?: string;
  OSHA_10?: string;
  OSHA_30?: string;
  promoUrl?: string;
  domain: string;
  sourceCreatedAt?: Date | string;
  sourceUpdatedAt?: Date | string;
}) => {
  try {
    if (!signupData.domain) {
      return { success: false, error: "Domain is required" };
    }
    if (!signupData.email) {
      return { success: false, error: "Email is required" };
    }
    if (!signupData.originId) {
      return { success: false, error: "originId is required" };
    }

    const existing = await StickySignup.findOne({
      originId: signupData.originId,
      domain: signupData.domain,
    });
    if (existing) {
      return {
        success: false,
        error: "Sticky signup already exists",
        existing_id: existing._id,
        skipped: true,
      };
    }

    const stickySignup = new StickySignup({
      originId: signupData.originId,
      email: signupData.email.trim().toLowerCase(),
      phone: signupData.phone?.trim() || "",
      OSHA_10: signupData.OSHA_10 || "",
      OSHA_30: signupData.OSHA_30 || "",
      promoUrl: signupData.promoUrl || "",
      domain: signupData.domain,
      sourceCreatedAt: signupData.sourceCreatedAt
        ? new Date(signupData.sourceCreatedAt)
        : undefined,
      sourceUpdatedAt: signupData.sourceUpdatedAt
        ? new Date(signupData.sourceUpdatedAt)
        : undefined,
    });

    const saved = await stickySignup.save();
    if (!saved) {
      return { success: false, error: "Failed to create sticky signup" };
    }

    const { category, leadFields, formattedDomain } = getLeadDetails(
      "Sticky SignUp",
      new ObjectId(saved._id.toString()),
      signupData.domain
    );

    const email = saved.email || null;
    const contactNo = saved.phone || null;
    // Sticky API has no name — use email local-part for display
    const fullName = email ? String(email).split("@")[0] : null;

    const lead = new Lead({
      category,
      ...leadFields,
      sticky_signup: saved._id,
      email,
      fullname: fullName,
      contactNo,
      domain: formattedDomain,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: saved.sourceCreatedAt || new Date(),
      notes: [],
      next_follow_up: null,
      conversion_value: null,
    });

    const leadResult = await lead.save();

    try {
      await createNewLeadNotification(leadResult);
    } catch (notificationError) {
      console.warn(
        "Failed to create notification for sticky signup lead:",
        leadResult._id,
        notificationError
      );
    }

    try {
      if (socketServer) {
        socketServer.emitNewLead(leadResult);
      }
    } catch {
      // non-blocking
    }

    return {
      success: true,
      message: "Sticky signup and lead created successfully",
      data: { stickySignup: saved, lead: leadResult },
    };
  } catch (error: any) {
    // Duplicate key from unique index — treat as skip
    if (error?.code === 11000) {
      return {
        success: false,
        error: "Sticky signup already exists",
        skipped: true,
      };
    }
    console.error("Error creating sticky signup:", error.message);
    return {
      success: false,
      error: "Failed to create sticky signup",
      message: error.message,
    };
  }
};
