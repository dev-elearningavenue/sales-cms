import mongoose, { Schema } from "mongoose";

/**
 * Sticky SignUp records synced from OOR / OES / OOC stickySignUp APIs.
 * Dedup key: originId + domain
 */
const StickySignupSchema = new Schema(
  {
    originId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    OSHA_10: { type: String, default: "" },
    OSHA_30: { type: String, default: "" },
    promoUrl: { type: String, default: "" },
    domain: { type: String, required: true, index: true },
    sourceCreatedAt: { type: Date },
    sourceUpdatedAt: { type: Date },
  },
  { timestamps: true, strict: false }
);

StickySignupSchema.index({ originId: 1, domain: 1 }, { unique: true });

export const StickySignup =
  mongoose.models.StickySignup ||
  mongoose.model("StickySignup", StickySignupSchema, "stickysignups");

export default StickySignup;
