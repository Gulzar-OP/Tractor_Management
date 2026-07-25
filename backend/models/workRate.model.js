import mongoose from "mongoose";

const workRateSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      default: "minutes",
    },
  },
  { timestamps: true }
);

// workRateSchema.index({ owner: 1, type: 1 }, { unique: true });

export default mongoose.model("WorkRate", workRateSchema);