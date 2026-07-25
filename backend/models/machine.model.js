import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    rate: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

export default mongoose.model("Machine", machineSchema);
