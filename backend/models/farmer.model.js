import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
  name: { type: String, required: true },
  fatherName: { type: String },
  farmName: { type: String },
  phone: String,
  village: String,
  address: String,
  totalWorkMinutes: { type: Number, default: 0 },
  totalBilledAmount: { type: Number, default: 0 },
  totalPaidAmount: { type: Number, default: 0 },
  totalDueAmount: { type: Number, default: 0 },
  lastWorkDate: { type: Date },
  works: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
    },
  ],
  notes: { type: String },
});

export default mongoose.model("Farmer", farmerSchema);