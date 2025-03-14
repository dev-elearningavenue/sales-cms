import mongoose from "mongoose";

export const Scholarship = mongoose.models.Scholarship ||
  mongoose.model(
    "Scholarship",
    new mongoose.Schema({}, { strict: false }),
    "scholarships"
  );

export default Scholarship; 