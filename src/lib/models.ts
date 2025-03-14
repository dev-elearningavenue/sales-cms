// src/lib/models.ts
// This file ensures all models are registered with Mongoose
import Customer from "@/models/customer";
import Contact from "@/models/contact";
import User from "@/models/user";
import Lead from "@/models/lead";
import Log from "@/models/log";
import Scholarship from "@/models/scholarship";
import AbandonedCart from "@/models/abandonedCart";
import OrderCreation from "@/models/orders";

// Export all models to ensure they're registered
export const models = {
  Customer,
  Contact,
  User,
  Lead,
  Log,
  Scholarship,
  AbandonedCart,
  OrderCreation,
};

// Export a function to ensure models are registered
export const ensureModelsAreRegistered = () => {
  return Object.keys(models).length > 0;
}; 