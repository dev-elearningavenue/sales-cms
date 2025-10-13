"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureModelsAreRegistered = exports.models = void 0;
// src/lib/models.ts
// This file ensures all models are registered with Mongoose
const customer_1 = __importDefault(require("@/models/customer"));
const contact_1 = __importDefault(require("@/models/contact"));
const user_1 = __importDefault(require("@/models/user"));
const lead_1 = __importDefault(require("@/models/lead"));
const log_1 = __importDefault(require("@/models/log"));
const invoice_1 = __importDefault(require("@/models/invoice"));
const scholarship_1 = __importDefault(require("@/models/scholarship"));
const abandonedCart_1 = __importDefault(require("@/models/abandonedCart"));
const orders_1 = __importDefault(require("@/models/orders"));
const shortCourseDiscount_1 = __importDefault(require("@/models/shortCourseDiscount"));
// Export all models to ensure they're registered
exports.models = {
    Customer: customer_1.default,
    Contact: contact_1.default,
    User: user_1.default,
    Lead: lead_1.default,
    Log: log_1.default,
    Invoice: invoice_1.default,
    Scholarship: scholarship_1.default,
    AbandonedCart: abandonedCart_1.default,
    OrderCreation: orders_1.default,
    ShortCourseDiscount: shortCourseDiscount_1.default,
};
// Export a function to ensure models are registered
const ensureModelsAreRegistered = () => {
    return Object.keys(exports.models).length > 0;
};
exports.ensureModelsAreRegistered = ensureModelsAreRegistered;
