import mongoose from "mongoose";
import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import paymentModel from "../models/payment.model.js";
import farmerAdvanceLotModel from "../models/farmerAdvanceLot.model.js";
import farmerAdvanceAllocationModel from "../models/farmerAdvanceAllocation.model.js";
import farmerAdvanceLedgerModel from "../models/farmerAdvanceLedger.model.js";
import {
  generateFarmerSearchFields,
} from "../utils/searchTransliteration.js";

// export const allFarmers = async (req, res) => {
//   try {
//     if (!["owner", "driver"].includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }

//     const farmers = await Farmer.find({
//       owner: req.ownerId,
//     })
//       .sort({ name: 1 })
//       .lean();

//     return res.status(200).json({
//       success: true,
//       message: "All farmers found",
//       farmers,
//     });
//   } catch (error) {
//     console.error("allFarmers error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };


// export const deleteFarmer = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
    
//     const { id: farmerId } = req.params;
//     console.log("DELETE FARMER REQUEST:",farmerId)

//     if (!mongoose.Types.ObjectId.isValid(farmerId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid farmer ID",
//       });
//     }
//     console.log("DELETE FARMER AUTH:", {
//   user: req.user,
//   params: req.params,
//   authorization: !!req.headers.authorization,
// });

// const ownerId =
//   req?.ownerId || req.user?.userId;

// console.log("DELETE FARMER OWNER:", ownerId);

//     // const ownerId =
//     //   req.user?.ownerId || req.user?.userId;

//     if (!ownerId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     let deletedData;

//     await session.withTransaction(async () => {
//       const farmer = await Farmer.findOne({
//         _id: farmerId,
//         owner: ownerId,
//       }).session(session);

//       if (!farmer) {
//         const error = new Error("Farmer not found");
//         error.statusCode = 404;
//         throw error;
//       }

//       // Find all farmer work IDs
//       const works = await WorkLog.find({
//         farmer: farmer._id,
//         owner: ownerId,
//       })
//         .select("_id")
//         .session(session);

//       const workIds = works.map((work) => work._id);

//       // Delete payments linked to farmer OR farmer's works
//       const paymentResult = await paymentModel.deleteMany({
//         owner: ownerId,
//         $or: [
//           { farmerID: farmer._id },
//           { workId: { $in: workIds } },
//         ],
//       }).session(session);

//       // Delete all farmer works
//       const workResult = await WorkLog.deleteMany({
//         farmer: farmer._id,
//         owner: ownerId,
//       }).session(session);

//       // Delete farmer
//       const farmerResult = await Farmer.deleteOne({
//         _id: farmer._id,
//         owner: ownerId,
//       }).session(session);

//       if (farmerResult.deletedCount !== 1) {
//         throw new Error("Farmer deletion failed");
//       }

//       deletedData = {
//         farmerId: farmer._id,
//         farmerName: farmer.name,
//         deletedWorks: workResult.deletedCount,
//         deletedPayments: paymentResult.deletedCount,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Farmer and all related data deleted successfully",
//       deleted: deletedData,
//     });

//   } catch (error) {
//     console.error("DELETE FARMER ERROR:", error);

//     return res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });

//   } finally {
//     await session.endSession();
//   }
// };

// farmer.controller.js me purane deleteFarmer ki jagah ye poora function paste karo.
// (imports pehle se file ke top par hain: farmerAdvanceLotModel,
//  farmerAdvanceAllocationModel, farmerAdvanceLedgerModel)

export const deleteFarmer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id: farmerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    // Route par isOwner hai, ye dobara check safety ke liye
    if (req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can delete farmers",
      });
    }

    const ownerId = req.ownerId;

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

      // Running ya paused work ke saath delete nahi hona chahiye
      const activeWork = await WorkLog.exists({
        farmer: farmer._id,
        owner: ownerId,
        status: { $in: ["RUNNING", "PAUSED"] },
      }).session(session);

      if (activeWork) {
        const error = new Error(
          "Farmer has a running or paused work. Stop it first."
        );
        error.statusCode = 400;
        throw error;
      }

      const works = await WorkLog.find({
        farmer: farmer._id,
        owner: ownerId,
      })
        .select("_id")
        .session(session);

      const workIds = works.map((work) => work._id);

      const paymentResult = await paymentModel
        .deleteMany({
          owner: ownerId,
          $or: [
            { farmerID: farmer._id },
            { workId: { $in: workIds } },
          ],
        })
        .session(session);

      // Advance ka poora hisaab bhi hatao, warna orphan rows bachti hain
      await farmerAdvanceAllocationModel
        .deleteMany({ owner: ownerId, farmerID: farmer._id })
        .session(session);

      await farmerAdvanceLotModel
        .deleteMany({ owner: ownerId, farmerID: farmer._id })
        .session(session);

      await farmerAdvanceLedgerModel
        .deleteMany({ owner: ownerId, farmerID: farmer._id })
        .session(session);

      const workResult = await WorkLog.deleteMany({
        farmer: farmer._id,
        owner: ownerId,
      }).session(session);

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
    if (!error.statusCode) {
      console.error("DELETE FARMER ERROR:", error);
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  } finally {
    await session.endSession();
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

// farmer.controller.js me purane getFarmerAdvanceHistory ki jagah ye poora function paste karo.
// Naya: response me `summary` (kitna mila / kitna use hua / kitna bacha) aur
// `lots` (har advance jama ka hisaab: diya, use hua, bacha) bhi aata hai.
// `transactions` pehle jaisa hi hai.

export const getFarmerAdvanceHistory = async (req, res) => {
  const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

  try {
    const owner = req.ownerId;
    const { farmerID } = req.params;

    if (!owner) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(farmerID)) {
      return res.status(400).json({ success: false, message: "Invalid farmer ID." });
    }

    const farmer = await Farmer.findOne({ _id: farmerID, owner }).select(
      "name phone advanceAmount"
    );

    if (!farmer) {
      return res.status(404).json({ success: false, message: "Farmer not found." });
    }

    const [ledger, lotDocs] = await Promise.all([
      farmerAdvanceLedgerModel
        .find({ owner, farmerID })
        .populate("paymentId", "amount paymentMethod paymentDate status paymentType")
        .populate("workId", "date totalAmount status")
        .sort({ createdAt: -1 })
        .lean(),

      // Reversed (delete/edit ke baad hata hua) lots ginti me nahi aate
      farmerAdvanceLotModel
        .find({ owner, farmerID, status: "ACTIVE" })
        .populate("paymentId", "amount paymentMethod paymentDate transactionId")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const lots = lotDocs.map((lot) => {
      const given = round2(lot.originalAmount || 0);
      const remaining = round2(lot.remainingAmount || 0);

      return {
        _id: lot._id,
        date: lot.paymentId?.paymentDate || lot.createdAt,
        sourceType: lot.sourceType,
        given,
        used: round2(given - remaining),
        remaining,
        method: lot.paymentId?.paymentMethod || null,
        transactionId: lot.paymentId?.transactionId || null,
        description: lot.description || "",
      };
    });

    const totalReceived = round2(lots.reduce((s, l) => s + l.given, 0));
    const totalRemaining = round2(lots.reduce((s, l) => s + l.remaining, 0));

    return res.status(200).json({
      success: true,
      farmer: {
        _id: farmer._id,
        name: farmer.name,
        phone: farmer.phone,
        advanceAmount: farmer.advanceAmount || 0,
      },
      summary: {
        totalReceived,
        totalUsed: round2(totalReceived - totalRemaining),
        balance: totalRemaining,
      },
      lots,
      transactions: ledger,
    });
  } catch (error) {
    console.error("getFarmerAdvanceHistory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer advance history.",
    });
  }
};
export const searchFarmers = async (req, res) => {
  try {
    const { query } = req.query;

    const ownerId = req.ownerId;

    if (!ownerId) {
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

    const farmers = await Farmer.find({
      owner: ownerId,
      isArchived: { $ne: true },
      $or: [
        { name: regex },
        { phone: regex },
        { village: regex },
        { district: regex },
        { nameSearch: regex },
        { villageSearch: regex },
        { districtSearch: regex },
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

export const allFarmers = async (req, res) => {
  try {
    if (!["owner", "driver"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // body: { archived: true } -> sirf archived farmers (restore screen ke liye)
    const wantArchived = req.body?.archived === true;

    const farmers = await Farmer.find({
      owner: req.ownerId,
      isArchived: wantArchived ? true : { $ne: true },
    });

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


// =====================================================
// ARCHIVE FARMER (soft delete)
// =====================================================

export const archiveFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = req.ownerId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    const farmer = await Farmer.findOne({ _id: id, owner })
      .select("name isArchived totalDueAmount advanceAmount")
      .lean();

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    if (farmer.isArchived) {
      return res.status(200).json({
        success: true,
        message: "Farmer already archived",
      });
    }

    const activeWork = await WorkLog.exists({
      owner,
      farmer: farmer._id,
      status: { $in: ["RUNNING", "PAUSED"] },
    });

    if (activeWork) {
      return res.status(400).json({
        success: false,
        message: "Farmer has a running or paused work. Stop it first.",
      });
    }

    await Farmer.updateOne(
      { _id: farmer._id, owner },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );

    const due = Number(farmer.totalDueAmount || 0);
    const advance = Number(farmer.advanceAmount || 0);

    return res.status(200).json({
      success: true,
      message: "Farmer archived. Data safe hai, kabhi bhi restore kar sakte ho.",
      // Archived farmer ka due/advance hisaab me bana rehta hai
      warning:
        due > 0 || advance > 0
          ? `Is farmer ka due ₹${due} aur advance ₹${advance} abhi bhi hisaab me rahega.`
          : undefined,
    });
  } catch (error) {
    console.error("archiveFarmer error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// =====================================================
// RESTORE FARMER
// =====================================================

export const restoreFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    const result = await Farmer.updateOne(
      { _id: id, owner: req.ownerId },
      { $set: { isArchived: false, archivedAt: null } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Farmer restored",
    });
  } catch (error) {
    console.error("restoreFarmer error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const repairFarmerAdvanceLedger = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = req.ownerId;
    const { farmerID } = req.params;
    const apply = req.body?.apply === true;

    const round2 = (value) =>
      Math.round((Number(value) + Number.EPSILON) * 100) / 100;

    if (!mongoose.Types.ObjectId.isValid(farmerID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID.",
      });
    }

    let result;

    await session.withTransaction(async () => {
      const farmer = await Farmer.findOne({
        _id: farmerID,
        owner,
      }).session(session);

      if (!farmer) {
        const error = new Error("Farmer not found.");
        error.statusCode = 404;
        throw error;
      }

      const lots = await farmerAdvanceLotModel
        .find({
          owner,
          farmerID: farmer._id,
          status: "ACTIVE",
        })
        .sort({ createdAt: 1, _id: 1 })
        .session(session);

      const balance = round2(farmer.advanceAmount || 0);

      const lotsBalance = round2(
        lots.reduce(
          (sum, lot) => sum + Number(lot.remainingAmount || 0),
          0
        )
      );

      const diff = round2(balance - lotsBalance);

      if (Math.abs(diff) <= 0.01) {
        result = {
          inSync: true,
          applied: false,
          farmerBalance: balance,
          lotsBalance,
          message: "Ledger already in sync. Kuch fix karne ki zaroorat nahi.",
        };
        return;
      }

      const plan =
        diff > 0
          ? { action: "CREATE_OPENING_LOT", amount: diff }
          : { action: "REDUCE_NEWEST_LOTS", amount: round2(-diff) };

      if (!apply) {
        result = {
          inSync: false,
          applied: false,
          farmerBalance: balance,
          lotsBalance,
          difference: diff,
          plan,
          message:
            "Ye sirf plan hai. Asli fix ke liye body me { \"apply\": true } bhejo.",
        };
        return;
      }

      if (diff > 0) {
        await createAdvanceLot({
          farmer,
          owner,
          amount: diff,
          sourceType: "OPENING",
          description: "Ledger reconciliation: balance ke liye opening lot",
          session,
        });
      } else {
        let need = round2(-diff);

        for (let i = lots.length - 1; i >= 0 && need > 0; i--) {
          const lot = lots[i];
          const available = round2(lot.remainingAmount || 0);
          const take = round2(Math.min(available, need));

          if (take <= 0) continue;

          lot.remainingAmount = round2(available - take);
          await lot.save({ session });

          need = round2(need - take);
        }

        await recordAdvanceMovement({
          farmer,
          owner,
          type: "DEBIT",
          amount: round2(-diff),
          description: "Ledger reconciliation adjustment",
          referenceId: `RECONCILE-${farmer._id}-${Date.now()}`,
          session,
        });
      }

      result = {
        inSync: true,
        applied: true,
        farmerBalance: balance,
        lotsBalanceBefore: lotsBalance,
        lotsBalanceAfter: balance,
        plan,
        message: "Ledger repair ho gaya. Ab work stop/add normal chalega.",
      };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (!error.statusCode) {
      console.error("repairFarmerAdvanceLedger error:", error);
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Server error",
    });
  } finally {
    await session.endSession();
  }
};

const IST_DAY_MS = 24 * 60 * 60 * 1000;

const toObjectId = (id) => new mongoose.Types.ObjectId(id);


// Get Farmer Profile (response shape wahi: raw farmer doc + works)
export const getFarmerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    const farmer = await Farmer.findOne({
      _id: id,
      owner: req.ownerId,
    }).populate("works");

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    res.json(farmer);
  } catch (err) {
    console.error("getFarmerById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Farmer Work History
export const getFarmerHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    const history = await WorkLog.find({
      farmer: id,
      owner: req.ownerId,
    }).sort({ date: -1 });

    res.json(history);
  } catch (err) {
    console.error("getFarmerHistory error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// All Farmers with Dues (archived farmers bhi, kyunki paisa baaki hai)
export const getFarmersWithDues = async (req, res) => {
  try {
    const farmers = await Farmer.find({
      owner: req.ownerId,
      totalDueAmount: { $gt: 0 },
    });

    res.json(farmers);
  } catch (err) {
    console.error("getFarmersWithDues error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const createFarmer = async (req, res) => {
  try {
    const {
      name,
      phone,
      village,
      district,
      lastWorkDate,
      fatherName,
      notes,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Farmer name is required",
      });
    }

    // Totals client se nahi liye jaate: hamesha 0 se shuru,
    // baad me syncFarmerSummary khud nikalta hai.
    const farmer = await Farmer.create({
      createdBy: req.user.userId,
      owner: req.ownerId,

      name: name.trim(),
      phone,
      village,
      district,
      lastWorkDate,
      fatherName: fatherName || "",
      notes: notes || "",

      // Hindi + English searchable fields
      ...generateFarmerSearchFields({
        name,
        village,
        district,
      }),
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


export const updateFarmer = async (req, res) => {
  try {
    const farmerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID",
      });
    }

    const userId = req.user.userId;
    const ownerId = req.ownerId;

    // Owner apne account ke saare farmers update kar sakta hai.
    // Driver sirf apne banaye hue farmers.
    const ownershipFilter = {
      _id: farmerId,
      owner: ownerId,
    };

    if (String(userId) !== String(ownerId)) {
      ownershipFilter.createdBy = userId;
    }

    const existingFarmer = await Farmer.findOne(ownershipFilter);

    if (!existingFarmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const {
      name,
      phone,
      village,
      district,
      lastWorkDate,
      fatherName,
      notes,
    } = req.body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Farmer name cannot be empty",
      });
    }

    // Sirf allowed fields. totals / advance / owner kabhi body se nahi.
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (village !== undefined) updateData.village = village;
    if (district !== undefined) updateData.district = district;
    if (lastWorkDate !== undefined) updateData.lastWorkDate = lastWorkDate;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (notes !== undefined) updateData.notes = notes;

    Object.assign(
      updateData,
      generateFarmerSearchFields({
        name: updateData.name ?? existingFarmer.name,
        village: updateData.village ?? existingFarmer.village,
        district: updateData.district ?? existingFarmer.district,
      })
    );

    const updatedFarmer = await Farmer.findOneAndUpdate(
      ownershipFilter,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Farmer updated successfully",
      farmer: updatedFarmer,
    });
  } catch (err) {
    console.error("Update Farmer Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const earningTotal = async (req, res) => {
  try {
    const result = await Farmer.aggregate([
      { $match: { owner: toObjectId(req.ownerId) } },
      {
        $group: {
          _id: null,
          totalEarning: { $sum: "$totalBilledAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      message: "Mil gaya chief 😎",
      totalEarning: result[0]?.totalEarning || 0,
      count: result[0]?.count || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const duesTotal = async (req, res) => {
  try {
    const result = await Farmer.aggregate([
      { $match: { owner: toObjectId(req.ownerId) } },
      {
        $group: {
          _id: null,
          totalDues: { $sum: "$totalDueAmount" },
        },
      },
    ]);

    res.status(200).json({
      message: "Mil gaya chief 😎",
      totalDues: result[0]?.totalDues || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Aaj ki kamai: IST (Asia/Kolkata) ke din ke hisaab se, cancelled works nahi
export const todayEarnings = async (req, res) => {
  try {
    const istDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const start = new Date(`${istDate}T00:00:00+05:30`);
    const end = new Date(start.getTime() + IST_DAY_MS);

    const result = await WorkLog.aggregate([
      {
        $match: {
          owner: toObjectId(req.ownerId),
          status: { $ne: "CANCELLED" },
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          totalEarning: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
    ]);

    const totals = result[0] || {
      totalEarning: 0,
      totalPaid: 0,
      totalDue: 0,
    };

    res.status(200).json({
      message: "Mil gaya chief 😎",
      totalEarning: totals.totalEarning,
      totalPaid: totals.totalPaid,
      totalDue: totals.totalDue,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const allFarmerHistory = async (req, res) => {
  try {
    const allHistory = await Farmer.find({
      owner: req.ownerId,
    }).populate("works");

    res.status(200).json({
      message: "Mil gaya chief 😎",
      data: allHistory,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};