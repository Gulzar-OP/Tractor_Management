
import mongoose from "mongoose";

const farmerAdvanceLotSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    farmerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },

    // PAYMENT = advance received through a payment
    // OPENING = existing advance migrated into the ledger
    sourceType: {
      type: String,
      enum: ["PAYMENT", "OPENING"],
      required: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

farmerAdvanceLotSchema.index({
  owner: 1,
  farmerID: 1,
  status: 1,
  createdAt: 1,
});

farmerAdvanceLotSchema.index({
  owner: 1,
  paymentId: 1,
});

export default mongoose.model(
  "FarmerAdvanceLot",
  farmerAdvanceLotSchema
);
