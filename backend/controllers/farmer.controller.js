import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";

export const createFarmer = async (req, res) => {
  try {
    const {
      name,
      phone,
      village,
      lastWorkDate,
      fatherName,
      notes,
      totalWorkMinutes,
      totalBilledAmount,
      totalPaidAmount,
      totalDueAmount,
    } = req.body;
      console.log(req.user.userId);
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Farmer name is required",
      });
    }

    const farmer = await Farmer.create({
      createdBy: req.user.userId, 
      owner: req.user.ownerId,
      name,
      phone,
      village,
      lastWorkDate,
      fatherName: fatherName || "",
      notes: notes || "",
      totalWorkMinutes: totalWorkMinutes || 0,
      totalBilledAmount: totalBilledAmount || 0,
      totalPaidAmount: totalPaidAmount || 0,
      totalDueAmount: totalDueAmount || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Farmer created successfully",
      farmer,
    });
  } catch (err) {
    console.error("Create Farmer Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


// Get Farmer Profile
export const getFarmerById = async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id).populate('works');
    res.json(farmer);
  } catch (err) {
    res.status(404).json({ error: "Farmer not found" });
  }
};

// Farmer Work History
export const getFarmerHistory = async (req, res) => {
  try {
    // const work = await WorkLog.findById({})
    const history = await WorkLog.find({ farmer: req.params.id })
      .sort({ date: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// All Farmers with Dues
export const getFarmersWithDues = async (req, res) => {
  const farmers = await Farmer.find({ totalDueAmount: { $gt: 0 } });
  res.json(farmers);
};

export const allFarmers = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "owner") {
      filter.owner = req.user.ownerId;
    } else if (req.user.role === "driver") {
      filter.createdBy = req.user.userId;
    }

    const farmers = await Farmer.find(filter);

    return res.status(200).json({
      success: true,
      message: "All farmers found",
      farmers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const deleteFarmer = async (req, res) => {
  try {
    const farmerId = req.params.id;

    const farmer = await Farmer.findById(farmerId);

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    // 🧹 Delete related works also
    await WorkLog.deleteMany({ farmer: farmerId });

    await Farmer.findByIdAndDelete(farmerId);

    res.status(200).json({
      message: "Farmer deleted successfully",
      farmer,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateFarmer = async (req, res) => {
  try {
    const farmerId = req.params.id;

    const updatedFarmer = await Farmer.findByIdAndUpdate(
      farmerId,
      req.body,               
      { new: true, runValidators: true }
    );

    if (!updatedFarmer) {
      return res.status(404).json({
        error: "Farmer not found",
      });
    }

    res.status(200).json({
      message: "Update successfully",
      farmer: updatedFarmer,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const earningTotal = async (req, res) => {
  try {
    const result = await Farmer.aggregate([
      {
        $group: {
          _id: null,
          totalEarning: { $sum: "$totalBilledAmount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEarning = result[0]?.totalEarning || 0;
    const count = result[0]?.count || 0;
    res.status(200).json({
      message: "Mil gaya chief 😎",
      totalEarning,
      count
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const duesTotal = async (req, res) => {
  try {
    const result = await Farmer.aggregate([
      {
        $group: {
          _id: null,
          totalDues: { $sum: "$totalDueAmount" }
        }
      }
    ]);

    const totalDues = result[0]?.totalDues || 0;

    res.status(200).json({
      message: "Mil gaya chief 😎",
      totalDues
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const todayEarnings = async (req, res) => {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const result = await WorkLog.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalEarning: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" }
        }
      }
    ]);

    const totals = result[0] || {
      totalEarning: 0,
      totalPaid: 0,
      totalDue: 0
    };

    res.status(200).json({
      message: "Mil gaya chief 😎",
      ...totals
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const allFarmerHistory = async (req, res) => {
  try {
    const allHistory = await Farmer.find({}).populate("works");

    res.status(200).json({
      message: "Mil gaya chief 😎",
      data: allHistory
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// GET /api/farmer/search?query=ram
export const searchFarmers = async (req, res) => {
  try {
    const { query } = req.query;
 
    if (!query || !query.trim()) {
      return res.status(200).json({ success: true, farmers: [] });
    }
 
    const term = query.trim();
 
    // Case-insensitive partial match across multiple fields.
    // Using regex (not $text) so partial/mid-word matches work too,
    // e.g. typing "ram" matches "Ram Kumar".
    const regex = new RegExp(term, "i");
 
    const farmers = await Farmer.find({
      $or: [
        { name: regex },
        { phone: regex },
        { village: regex },
        { district: regex },
      ],
    })
      .limit(20)
      .sort({ name: 1 });
 
    return res.status(200).json({ success: true, farmers });
  } catch (err) {
    console.error("searchFarmers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};