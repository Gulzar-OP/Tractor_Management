import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    driverID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    farmerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Farmer",
        required: true
    },

    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK"],
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "SUCCESS"
    },

    transactionId: {
      type: String
    },

    note: {
      type: String,
      trim: true
    },
    dueAmount:Number,

    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
