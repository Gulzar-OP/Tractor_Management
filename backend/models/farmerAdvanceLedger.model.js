
import mongoose from "mongoose";

const farmerAdvanceLedgerSchema = new mongoose.Schema(
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

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT", "REVERSAL"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Groups related entries, e.g. original credit and its reversal.
    referenceId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

farmerAdvanceLedgerSchema.index({
  owner: 1,
  farmerID: 1,
  createdAt: -1,
});

farmerAdvanceLedgerSchema.index({
  owner: 1,
  paymentId: 1,
});

export default mongoose.model(
  "FarmerAdvanceLedger",
  farmerAdvanceLedgerSchema
);
