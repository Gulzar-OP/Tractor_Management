import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  fatherName: { type: String },
  farmName: { type: String },
  phone: String,
  village: String,
  address: String,
  district: String,
  nameSearch: {
    type: String,
    default: "",
  },

  villageSearch: {
    type: String,
    default: "",
  },

  districtSearch: {
    type: String,
    default: "",
  },
  totalWorkMinutes: { type: Number, default: 0 },
  totalBilledAmount: { type: Number, default: 0 },
  totalPaidAmount: { type: Number, default: 0 },
  totalDueAmount: { type: Number, default: 0 },
  advanceAmount:{
    type:Number,
    default:0,
    min:0,
  },
  lastWorkDate: { type: Date },
  works: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkLog",
    },
  ],
  notes: { type: String },

  // Delete ki jagah archive: data bacha rehta hai, bas lists/search se hat jaata hai
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date, default: null },
});

farmerSchema.index({ owner: 1, isArchived: 1, name: 1 });

export default mongoose.model("Farmer", farmerSchema);