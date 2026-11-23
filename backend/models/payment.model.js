
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional for independent farmer advance payments
    driverID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    farmerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },

    // Null for advance-only payments
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
      default: null,
    },

    paymentType: {
      type: String,
      enum: ["WORK_PAYMENT", "ADVANCE"],
      default: "WORK_PAYMENT",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    appliedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REVERSED"],
      default: "SUCCESS",
    },

    transactionId: String,

    note: {
      type: String,
      trim: true,
    },

    dueAmount: {
      type: Number,
      default: 0,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    reversedAt: Date,

    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reversalNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({
  owner: 1,
  farmerID: 1,
  paymentDate: -1,
});

paymentSchema.index({
  workId: 1,
  status: 1,
});

export default mongoose.model("Payment", paymentSchema);
