
import mongoose from "mongoose";

const farmerAdvanceAllocationSchema = new mongoose.Schema(
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

    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmerAdvanceLot",
      required: true,
      index: true,
    },

    // Original payment from which this advance came.
    // Null for migrated opening balance.
    sourcePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    // Work which consumed this advance.
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      index: true,
    },

    restoredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

farmerAdvanceAllocationSchema.index({
  owner: 1,
  farmerID: 1,
  workId: 1,
  status: 1,
});

farmerAdvanceAllocationSchema.index({
  owner: 1,
  sourcePaymentId: 1,
  status: 1,
});

export default mongoose.model(
  "FarmerAdvanceAllocation",
  farmerAdvanceAllocationSchema
);
