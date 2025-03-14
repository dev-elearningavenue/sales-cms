import mongoose, { Schema } from "mongoose";

export const Contact = mongoose.models.Contact ||
  mongoose.model(
    "Contact",
    new mongoose.Schema({}, { strict: false }),
    "contacts"
  );

export default Contact;