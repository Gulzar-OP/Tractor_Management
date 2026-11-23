import mongoose from "mongoose";
import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import paymentModel from "../models/payment.model.js";
import farmerAdvanceLotModel from "../models/farmerAdvanceLot.model.js";
import farmerAdvanceAllocationModel from "../models/farmerAdvanceAllocation.model.js";
import farmerAdvanceLedgerModel from "../models/farmerAdvanceLedger.model.js";

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
      // console.log(req.user.userId);
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
    // console.log("Farmer created:", farmer);

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
    console.log(farmer)
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
    if (!["owner", "driver"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const farmers = await Farmer.find({
      owner: req.user.ownerId,
    });
// console.log(farmers)
    return res.status(200).json({
      success: true,
      message: "All farmers found",
      farmers,
    });
  } catch (error) {
    console.error("allFarmers error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const deleteFarmer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    
    const { id: farmerId } = req.params;
    console.log("DELETE FARMER REQUEST:",farmerId)

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }
    console.log("DELETE FARMER AUTH:", {
  user: req.user,
  params: req.params,
  authorization: !!req.headers.authorization,
});

const ownerId =
  req?.ownerId || req.user?.userId;

console.log("DELETE FARMER OWNER:", ownerId);

    // const ownerId =
    //   req.user?.ownerId || req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    let deletedData;

    await session.withTransaction(async () => {
      const farmer = await Farmer.findOne({
        _id: farmerId,
        owner: ownerId,
      }).session(session);

      if (!farmer) {
        const error = new Error("Farmer not found");
        error.statusCode = 404;
        throw error;
      }

      // Find all farmer work IDs
      const works = await WorkLog.find({
        farmer: farmer._id,
        owner: ownerId,
      })
        .select("_id")
        .session(session);

      const workIds = works.map((work) => work._id);

      // Delete payments linked to farmer OR farmer's works
      const paymentResult = await paymentModel.deleteMany({
        owner: ownerId,
        $or: [
          { farmerID: farmer._id },
          { workId: { $in: workIds } },
        ],
      }).session(session);

      // Delete all farmer works
      const workResult = await WorkLog.deleteMany({
        farmer: farmer._id,
        owner: ownerId,
      }).session(session);

      // Delete farmer
      const farmerResult = await Farmer.deleteOne({
        _id: farmer._id,
        owner: ownerId,
      }).session(session);

      if (farmerResult.deletedCount !== 1) {
        throw new Error("Farmer deletion failed");
      }

      deletedData = {
        farmerId: farmer._id,
        farmerName: farmer.name,
        deletedWorks: workResult.deletedCount,
        deletedPayments: paymentResult.deletedCount,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Farmer and all related data deleted successfully",
      deleted: deletedData,
    });

  } catch (error) {
    console.error("DELETE FARMER ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });

  } finally {
    await session.endSession();
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

    const userId =
      req.user?.id ||
      req.user?._id ||
      req.user?.userId;

    const ownerId = req.ownerId;

    if (!userId || !ownerId) {
      console.log("Farmer search auth missing:", {
        user: req.user,
        ownerId: req.ownerId,
      });

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!query || !query.trim()) {
      return res.status(200).json({
        success: true,
        farmers: [],
      });
    }

    const term = query.trim();

    const escapedTerm = term.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(escapedTerm, "i");

    // Owner sees all farmers under their account.
    // Driver sees only farmers created by them.
    const isOwner = String(userId) === String(ownerId);

    const ownershipFilter = {
      owner: ownerId,
    };

    if (!isOwner) {
      ownershipFilter.createdBy = userId;
    }

    const farmers = await Farmer.find({
      ...ownershipFilter,
      $or: [
        { name: regex },
        { phone: regex },
        { village: regex },
        { district: regex },
      ],
    })
      .sort({ name: 1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      farmers,
    });
  } catch (err) {
    console.error("searchFarmers error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getFarmerAdvanceReconciliation = async (req, res) => {
  try {
    const owner = req.user?.ownerId || req.user?.userId;
    const { farmerID } = req.params;

    const round2 = (value) =>
      Math.round((Number(value) + Number.EPSILON) * 100) / 100;

    const nearlyEqual = (a, b) =>
      Math.abs(round2(a) - round2(b)) <= 0.01;

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(farmerID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID.",
      });
    }

    // -----------------------------------------
    // 1. Fetch farmer
    // -----------------------------------------

    const farmer = await Farmer.findOne({
      _id: farmerID,
      owner,
    })
      .select(
        "name phone village advanceAmount totalBilledAmount totalPaidAmount totalDueAmount"
      )
      .lean();

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found.",
      });
    }

    // -----------------------------------------
    // 2. Fetch all accounting records
    // -----------------------------------------

    const [
      lots,
      allocations,
      works,
      latestLedger,
    ] = await Promise.all([
      farmerAdvanceLotModel.find({
        owner,
        farmerID,
      })
        .sort({ createdAt: 1 })
        .lean(),

      farmerAdvanceAllocationModel.find({
        owner,
        farmerID,
      })
        .sort({ createdAt: 1 })
        .lean(),

      WorkLog.find({
        owner,
        farmer: farmerID,
      })
        .select(
          "_id date totalAmount paidAmount advanceAppliedAmount dueAmount paymentStatus"
        )
        .lean(),

      farmerAdvanceLedgerModel.findOne({
        owner,
        farmerID,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // -----------------------------------------
    // 3. Calculate balances
    // -----------------------------------------

    const farmerBalance = round2(
      farmer.advanceAmount || 0
    );

    const activeLots = lots.filter(
      (lot) => lot.status === "ACTIVE"
    );

    const reversedLots = lots.filter(
      (lot) => lot.status === "REVERSED"
    );

    const activeLotBalance = round2(
      activeLots.reduce(
        (sum, lot) =>
          sum + Number(lot.remainingAmount || 0),
        0
      )
    );

    const activeAllocations = allocations.filter(
      (allocation) => allocation.status === "ACTIVE"
    );

    const reversedAllocations = allocations.filter(
      (allocation) => allocation.status === "REVERSED"
    );

    const totalConsumedAdvance = round2(
      activeAllocations.reduce(
        (sum, allocation) =>
          sum + Number(allocation.amount || 0),
        0
      )
    );

    // -----------------------------------------
    // 4. Validate individual lots
    // -----------------------------------------

    const lotIssues = [];

    for (const lot of lots) {
      const lotAllocations = allocations.filter(
        (allocation) =>
          String(allocation.lotId) === String(lot._id) &&
          allocation.status === "ACTIVE"
      );

      const consumed = round2(
        lotAllocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.amount || 0),
          0
        )
      );

      const remaining = round2(
        lot.remainingAmount || 0
      );

      const original = round2(
        lot.originalAmount || 0
      );

      const expectedTotal = round2(
        remaining + consumed
      );

      const validStatus =
        lot.status === "ACTIVE" ||
        lot.status === "REVERSED";

      if (!validStatus) {
        lotIssues.push({
          lotId: lot._id,
          reason: "Invalid lot status.",
        });
      }

      if (
        original < 0 ||
        remaining < 0 ||
        remaining > original + 0.01
      ) {
        lotIssues.push({
          lotId: lot._id,
          reason: "Invalid lot amount values.",
          original,
          remaining,
        });
      }

      if (
        lot.status === "ACTIVE" &&
        !nearlyEqual(original, expectedTotal)
      ) {
        lotIssues.push({
          lotId: lot._id,
          reason: "Original amount does not match remaining plus consumed amount.",
          original,
          remaining,
          consumed,
          expectedTotal,
        });
      }

      if (
        lot.status === "REVERSED" &&
        (!nearlyEqual(remaining, 0) ||
          !nearlyEqual(consumed, 0))
      ) {
        lotIssues.push({
          lotId: lot._id,
          reason: "Reversed lot still has remaining or consumed amount.",
          remaining,
          consumed,
        });
      }
    }

    // -----------------------------------------
    // 5. Validate work allocations
    // -----------------------------------------

    const workIssues = [];

    for (const work of works) {
      const workAllocations = activeAllocations.filter(
        (allocation) =>
          String(allocation.workId) === String(work._id)
      );

      const allocatedAmount = round2(
        workAllocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.amount || 0),
          0
        )
      );

      const appliedAmount = round2(
        work.advanceAppliedAmount || 0
      );

      if (!nearlyEqual(allocatedAmount, appliedAmount)) {
        workIssues.push({
          workId: work._id,
          reason: "Work advance and active allocations do not match.",
          workAdvanceApplied: appliedAmount,
          allocatedAmount,
        });
      }
    }

    // -----------------------------------------
    // 6. Validate allocation references
    // -----------------------------------------

    const allocationIssues = [];

    const lotIds = new Set(
      lots.map((lot) => String(lot._id))
    );

    const workIds = new Set(
      works.map((work) => String(work._id))
    );

    for (const allocation of allocations) {
      if (!lotIds.has(String(allocation.lotId))) {
        allocationIssues.push({
          allocationId: allocation._id,
          reason: "Referenced advance lot does not exist.",
        });
      }

      if (!workIds.has(String(allocation.workId))) {
        allocationIssues.push({
          allocationId: allocation._id,
          reason: "Referenced work does not exist.",
        });
      }

      if (
        allocation.amount <= 0 ||
        !Number.isFinite(Number(allocation.amount))
      ) {
        allocationIssues.push({
          allocationId: allocation._id,
          reason: "Invalid allocation amount.",
        });
      }
    }

    // -----------------------------------------
    // 7. Validate farmer balance
    // -----------------------------------------

    const balanceMatches = nearlyEqual(
      farmerBalance,
      activeLotBalance
    );

    // -----------------------------------------
    // 8. Final reconciliation
    // -----------------------------------------

    const allIssues = [
      ...lotIssues,
      ...workIssues,
      ...allocationIssues,
    ];

    if (!balanceMatches) {
      allIssues.push({
        reason: "Farmer advance and active lot balance do not match.",
        farmerBalance,
        activeLotBalance,
      });
    }

    const isReconciled = allIssues.length === 0;

    return res.status(200).json({
      success: true,

      reconciliation: {
        status: isReconciled ? "MATCHED" : "MISMATCH",
        isReconciled,
        issueCount: allIssues.length,
      },

      farmer: {
        _id: farmer._id,
        name: farmer.name,
        phone: farmer.phone,
        village: farmer.village,
      },

      balance: {
        farmerAdvance: farmerBalance,
        activeLotBalance,
        balanceDifference: round2(
          farmerBalance - activeLotBalance
        ),
        totalConsumedAdvance,
      },

      statistics: {
        totalLots: lots.length,
        activeLots: activeLots.length,
        reversedLots: reversedLots.length,
        totalAllocations: allocations.length,
        activeAllocations: activeAllocations.length,
        reversedAllocations: reversedAllocations.length,
        totalWorks: works.length,
      },

      workSummary: {
        totalBilledAmount: round2(
          farmer.totalBilledAmount || 0
        ),
        totalPaidAmount: round2(
          farmer.totalPaidAmount || 0
        ),
        totalDueAmount: round2(
          farmer.totalDueAmount || 0
        ),
      },

      latestLedger: latestLedger
        ? {
            type: latestLedger.type,
            amount: latestLedger.amount,
            balanceAfter: latestLedger.balanceAfter,
            description: latestLedger.description,
            createdAt: latestLedger.createdAt,
          }
        : null,

      issues: {
        lots: lotIssues,
        works: workIssues,
        allocations: allocationIssues,
        all: allIssues,
      },
    });
  } catch (error) {
    console.error("Advance reconciliation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reconcile farmer advance.",
      error: error.message,
    });
  }
};

export const getFarmerAdvanceHistory = async (req, res) => {
  try {
    const owner = getOwner(req);
    const { farmerID } = req.params;

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    if (!isValidId(farmerID)) {
      throw httpError("Invalid farmer ID.", 400);
    }

    const farmer = await Farmer.findOne({
      _id: farmerID,
      owner,
    }).select("name phone advanceAmount");

    if (!farmer) {
      throw httpError("Farmer not found.", 404);
    }

    const ledger = await FarmerAdvanceLedger.find({
      owner,
      farmerID,
    })
      .populate("paymentId", "amount paymentMethod paymentDate status paymentType")
      .populate("workId", "date totalAmount status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      farmer: {
        _id: farmer._id,
        name: farmer.name,
        phone: farmer.phone,
        advanceAmount: farmer.advanceAmount || 0,
      },
      transactions: ledger,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to fetch farmer advance history."
    );
  }
};
