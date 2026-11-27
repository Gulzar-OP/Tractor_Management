import mongoose from "mongoose";

// Admin ne kya kiya: update, enable/disable, password reset, delete.
// Delete ke baad bhi record bacha rahe, isliye target ka naam aur email copy karte hain.
const adminAuditSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, default: "" },
    action: {
      type: String,
      enum: ["UPDATE", "ENABLE", "DISABLE", "RESET_PASSWORD", "EXPORT", "DELETE"],
      required: true,
    },
    targetOwner: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetName: { type: String, default: "" },
    targetEmail: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

adminAuditSchema.index({ createdAt: -1 });

export default mongoose.model("AdminAudit", adminAuditSchema);