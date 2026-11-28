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

    // Password badalne par isse purane tokens invalid ho jate hain
    passwordChangedAt: { type: Date, default: null },
    resetPasswordTokenHash: { type: String, default: null, select: false },
    resetPasswordExpires: { type: Date, default: null, select: false },
    phone: String,

    village: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    approvedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: String,
    tractorModel: { type: String, trim: true, default: "" },
tractorNumber: { type: String, trim: true, default: "" },
currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);