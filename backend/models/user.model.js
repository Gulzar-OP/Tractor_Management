import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    role: {
      type: String,
      enum: ["owner", "driver", "admin"],
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: String,

    village: String,

    isActive: {
      type: Boolean,
      default: true,
    },
    tractorModel: { type: String, trim: true, default: "" },
tractorNumber: { type: String, trim: true, default: "" },
currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);