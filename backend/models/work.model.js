import mongoose from "mongoose";

const workSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },

    fieldName: {
      type: String,
      trim: true,
    },

    workRate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkRate",
      required: true,
    },

    workType: {
      type: String,
      required: true,
      trim: true,
    },

    ratePerHour: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["RUNNING", "PAUSED", "STOPPED", "IDLE"],
      default: "RUNNING",
      index: true,
    },

    startTime: Date,

    lastResumeTime: Date,

    endTime: Date,

    totalMinutes: {
      type: Number,
      default: 0,
    },

    lastLocation: {
      lat: Number,
      lng: Number,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "due", "advanced"],
      default: "due",
    },

    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

workSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model("WorkLog", workSchema);