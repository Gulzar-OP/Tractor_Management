
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import FarmerAdvanceLedger from "../models/farmerAdvanceLedger.model.js";
import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";
import FarmerAdvanceAllocation from "../models/farmerAdvanceAllocation.model.js";
import mongoose from "mongoose";
const round2 = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;


// =====================================================
// RECORD ADVANCE MOVEMENT
// =====================================================

export const recordAdvanceMovement = async ({
  farmer,
  owner,
  type,
  amount,
  paymentId = null,
  workId = null,
  description = "",
  referenceId = null,
  session,
}) => {
  const value = round2(amount);

  if (!farmer || !owner || !session) {
    throw new Error(
      "Farmer, owner and session are required"
    );
  }

  if (!["CREDIT", "DEBIT"].includes(type)) {
    throw new Error("Invalid advance ledger movement type");
  }

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const balanceAfter = round2(
    farmer.advanceAmount || 0
  );

  if (balanceAfter < 0) {
    throw new Error(
      "Farmer advance balance cannot be negative"
    );
  }

  const [entry] = await FarmerAdvanceLedger.create(
    [
      {
        owner,
        farmerID: farmer._id,
        type,
        amount: value,
        balanceAfter,
        paymentId,
        workId,
        description,
        referenceId,
      },
    ],
    { session }
  );

  return entry;
};


// =====================================================
// CREATE ADVANCE LOT
// =====================================================

/**
 * Call after farmer.advanceAmount has been increased
 * and farmer has been saved in the same transaction.
 */

export const createAdvanceLot = async ({
  farmer,
  owner,
  amount,
  paymentId = null,
  sourceType,
  description = "",
  session,
}) => {
  const value = round2(amount);

  if (!farmer || !owner || !session) {
    throw new Error(
      "Farmer, owner and session are required"
    );
  }

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const resolvedSourceType =
    sourceType || (paymentId ? "PAYMENT" : "OPENING");

  if (!["PAYMENT", "OPENING"].includes(resolvedSourceType)) {
    throw new Error("Invalid advance source type");
  }

  const [lot] = await FarmerAdvanceLot.create(
    [
      {
        owner,
        farmerID: farmer._id,
        sourceType: resolvedSourceType,
        paymentId,
        originalAmount: value,
        remainingAmount: value,
        status: "ACTIVE",
        description,
      },
    ],
    { session }
  );

  await recordAdvanceMovement({
    farmer,
    owner,
    type: "CREDIT",
    amount: value,
    paymentId,
    description,
    referenceId: paymentId
      ? String(paymentId)
      : `OPENING-${farmer._id}`,
    session,
  });

  return lot;
};



// =====================================================
// APPLY FARMER ADVANCE - FIFO
// =====================================================

/**
 * Applies advance to work using FIFO source lots.
 *
 * Must be called inside an active MongoDB transaction.
 */
export const applyFarmerAdvance = async (
  work,
  session
) => {
  if (!session) {
    throw new Error(
      "An active MongoDB session is required"
    );
  }

  const farmer = await Farmer.findOne({
    _id: work.farmer,
    owner: work.owner,
  }).session(session);

  if (!farmer) {
    throw new Error("Farmer not found");
  }

  const due = Math.max(
    0,
    round2(
      Number(work.totalAmount || 0) -
      Number(work.paidAmount || 0)
    )
  );

  const available = Math.max(
    0,
    round2(farmer.advanceAmount || 0)
  );

  const lots = await FarmerAdvanceLot.find({
    owner: work.owner,
    farmerID: farmer._id,
    status: "ACTIVE",
    remainingAmount: { $gt: 0 },
  })
    .sort({ createdAt: 1, _id: 1 })
    .session(session);

  const lotsBalance = round2(
    lots.reduce(
      (sum, lot) =>
        sum + Number(lot.remainingAmount || 0),
      0
    )
  );

  // Never silently consume an incomplete ledger.
  if (Math.abs(lotsBalance - available) > 0.01) {
    throw new Error(
      `Advance ledger mismatch. Farmer balance: ₹${available.toFixed(
        2
      )}, source lots: ₹${lotsBalance.toFixed(
        2
      )}. Reconciliation required.`
    );
  }

  const applied = round2(
    Math.min(due, available)
  );

  let remainingToApply = applied;
  const createdAllocations = [];

  // -----------------------------------------
  // Consume lots in FIFO order
  // -----------------------------------------

  for (const lot of lots) {
    if (remainingToApply <= 0) break;

    const lotAvailable = round2(
      lot.remainingAmount || 0
    );

    const consume = round2(
      Math.min(lotAvailable, remainingToApply)
    );

    if (consume <= 0) continue;

    lot.remainingAmount = round2(
      lotAvailable - consume
    );

    await lot.save({ session });

    const [allocation] =
      await FarmerAdvanceAllocation.create(
        [
          {
            owner: work.owner,
            farmerID: farmer._id,
            lotId: lot._id,
            sourcePaymentId: lot.paymentId,
            workId: work._id,
            amount: consume,
            status: "ACTIVE",
          },
        ],
        { session }
      );

    createdAllocations.push(allocation);

    remainingToApply = round2(
      remainingToApply - consume
    );
  }

  if (remainingToApply > 0.01) {
    throw new Error(
      "Unable to allocate the complete advance amount"
    );
  }

  // -----------------------------------------
  // Update work and farmer balances
  // -----------------------------------------

  if (applied > 0) {
    work.paidAmount = round2(
      Number(work.paidAmount || 0) + applied
    );

    work.advanceAppliedAmount = round2(
      Number(work.advanceAppliedAmount || 0) +
      applied
    );

    farmer.advanceAmount = round2(
      available - applied
    );

    await farmer.save({ session });

    await recordAdvanceMovement({
      farmer,
      owner: work.owner,
      type: "DEBIT",
      amount: applied,
      workId: work._id,
      description: `Advance applied to work ${work._id}`,
      referenceId: `WORK-${work._id}`,
      session,
    });
  }

  work.dueAmount = Math.max(
    0,
    round2(
      Number(work.totalAmount || 0) -
      Number(work.paidAmount || 0)
    )
  );

  work.paymentStatus =
    work.dueAmount === 0
      ? "paid"
      : work.paidAmount > 0
        ? "partial"
        : "due";

  await work.save({ session });

  return {
    applied,
    remainingAdvance: farmer.advanceAmount,
    remainingDue: work.dueAmount,
    allocations: createdAllocations,
  };
};


// =====================================================
// RESTORE ADVANCE WHEN WORK IS DELETED
// =====================================================

/**
 * Restores the exact source lots consumed by this work.
 *
 * Call before deleting the work, inside the same transaction.
 */
export const restoreWorkAdvanceAllocations = async ({
  work,
  farmer,
  owner,
  session,
}) => {
  if (!work || !farmer || !owner || !session) {
    throw new Error(
      "Work, farmer, owner and session are required"
    );
  }

  const allocations =
    await FarmerAdvanceAllocation.find({
      owner,
      farmerID: farmer._id,
      workId: work._id,
      status: "ACTIVE",
    }).session(session);

  const allocatedTotal = round2(
    allocations.reduce(
      (sum, allocation) =>
        sum + Number(allocation.amount || 0),
      0
    )
  );

  const workAdvance = round2(
    work.advanceAppliedAmount || 0
  );

  if (
    Math.abs(allocatedTotal - workAdvance) > 0.01
  ) {
    throw new Error(
      `Work advance allocation mismatch. Work records ₹${workAdvance.toFixed(
        2
      )}, allocation records ₹${allocatedTotal.toFixed(
        2
      )}. Reconciliation required before deleting work.`
    );
  }

  if (allocatedTotal <= 0) {
    return {
      restoredAmount: 0,
      restoredAllocations: 0,
    };
  }

  // Restore every amount to its original source lot.
  for (const allocation of allocations) {
    const lot = await FarmerAdvanceLot.findOne({
      _id: allocation.lotId,
      owner,
      farmerID: farmer._id,
      status: "ACTIVE",
    }).session(session);

    if (!lot) {
      throw new Error(
        `Advance source lot ${allocation.lotId} not found`
      );
    }

    lot.remainingAmount = round2(
      Number(lot.remainingAmount || 0) +
      Number(allocation.amount || 0)
    );

    if (
      lot.remainingAmount >
      lot.originalAmount + 0.01
    ) {
      throw new Error(
        "Restored advance exceeds original source amount"
      );
    }

    await lot.save({ session });

    allocation.status = "REVERSED";
    allocation.restoredAt = new Date();

    await allocation.save({ session });
  }

  farmer.advanceAmount = round2(
    Number(farmer.advanceAmount || 0) +
    allocatedTotal
  );

  await farmer.save({ session });

  await recordAdvanceMovement({
    farmer,
    owner,
    type: "CREDIT",
    amount: allocatedTotal,
    workId: work._id,
    description: `Advance restored after deleting work ${work._id}`,
    referenceId: `RESTORE-WORK-${work._id}`,
    session,
  });

  return {
    restoredAmount: allocatedTotal,
    restoredAllocations: allocations.length,
  };
};


// =====================================================
// SYNC FARMER SUMMARY
// =====================================================

export const syncFarmerSummary = async (
  farmerId,
  owner,
  session = null
) => {
  try {
    const farmerObjectId = new mongoose.Types.ObjectId(
      farmerId
    );

    const ownerObjectId = new mongoose.Types.ObjectId(
      owner
    );

    // =========================================
    // 1. AGGREGATE WORK LOGS
    // =========================================

    const aggregation = WorkLog.aggregate([
      {
        $match: {
          farmer: farmerObjectId,
          owner: ownerObjectId,
        },
      },
      {
        $group: {
          _id: "$farmer",

          totalWorkMinutes: {
            $sum: {
              $ifNull: ["$totalMinutes", 0],
            },
          },

          totalBilledAmount: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },

          totalPaidAmount: {
            $sum: {
              $add: [
                {
                  $ifNull: ["$paidAmount", 0],
                },
                {
                  $ifNull: [
                    "$advanceAppliedAmount",
                    0,
                  ],
                },
              ],
            },
          },

          totalDueAmount: {
            $sum: {
              $ifNull: ["$dueAmount", 0],
            },
          },
        },
      },
    ]);

    if (session) {
      aggregation.session(session);
    }

    const works = await aggregation;

    // =========================================
    // 2. SUMMARY DATA
    // =========================================

    const summary = works[0] || {
      totalWorkMinutes: 0,
      totalBilledAmount: 0,
      totalPaidAmount: 0,
      totalDueAmount: 0,
    };

    const totalMinutes =
      summary.totalWorkMinutes || 0;

    const totalHours = Math.floor(
      totalMinutes / 60
    );

    const remainingMinutes =
      totalMinutes % 60;

    const formattedWorkTime =
      totalHours > 0 && remainingMinutes > 0
        ? `${totalHours} Hours ${remainingMinutes} Minutes`
        : totalHours > 0
          ? `${totalHours} Hours`
          : `${remainingMinutes} Minutes`;

    // =========================================
    // 3. UPDATE FARMER
    // =========================================

    const updateQuery = Farmer.findOneAndUpdate(
      {
        _id: farmerObjectId,
        owner: ownerObjectId,
      },
      {
        $set: {
          totalWorkMinutes: totalMinutes,
          totalBilledAmount:
            summary.totalBilledAmount,
          totalPaidAmount:
            summary.totalPaidAmount,
          totalDueAmount:
            summary.totalDueAmount,
        },
      },
      {
        new: true,
      }
    );

    if (session) {
      updateQuery.session(session);
    }

    const farmer = await updateQuery;

    if (!farmer) {
      throw new Error(
        "Farmer not found while syncing summary"
      );
    }

    // =========================================
    // 4. RETURN UPDATED SUMMARY
    // =========================================

    return {
      totalBilledAmount:
        farmer.totalBilledAmount,

      totalDueAmount:
        farmer.totalDueAmount,

      totalPaidAmount:
        farmer.totalPaidAmount,

      totalWorkMinutes:
        farmer.totalWorkMinutes,

      // Additional fields
      totalMinutes:
        farmer.totalWorkMinutes,

      totalHours,

      formattedWorkTime,

      village: farmer.village,
    };
  } catch (error) {
    console.error(
      "syncFarmerSummary error:",
      error
    );

    throw error;
  }
};
