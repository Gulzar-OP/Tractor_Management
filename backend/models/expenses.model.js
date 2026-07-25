import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
      owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
    type: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);