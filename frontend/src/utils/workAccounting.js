
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";

/**
 * Apply farmer's available advance to a work's remaining due.
 * Must be called with an active MongoDB session.
 */
export const applyFarmerAdvance = async (work, session) => {
  const farmer = await Farmer.findOne({
    _id: work.farmer,
    owner: work.owner,
  }).session(session);

  if (!farmer) {
    throw new Error("Farmer not found");
  }

  const due = Math.max(
    0,
    Number(work.totalAmount || 0) -
      Number(work.paidAmount || 0)
  );

  const available = Math.max(
    0,
    Number(farmer.advanceAmount || 0)
  );

  const applied = Math.min(due, available);

  if (applied > 0) {
    work.paidAmount =
      Number(work.paidAmount || 0) + applied;

    work.advanceAppliedAmount =
      Number(work.advanceAppliedAmount || 0) + applied;

    farmer.advanceAmount = available - applied;

    await farmer.save({ session });
  }

  work.dueAmount = Math.max(
    0,
    Number(work.totalAmount || 0) -
      Number(work.paidAmount || 0)
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
  };
};


export const syncFarmerSummary = async (
  farmerId,
  ownerId,
  session
) => {
  const [summary] = await WorkLog.aggregate([
    {
      $match: {
        farmer: farmerId,
        owner: ownerId,
      },
    },
    {
      $group: {
        _id: null,
        totalWorkMinutes: { $sum: "$totalMinutes" },
        totalBilledAmount: { $sum: "$totalAmount" },
        totalPaidAmount: { $sum: "$paidAmount" },
        totalDueAmount: { $sum: "$dueAmount" },
        lastWorkDate: { $max: "$date" },
      },
    },
  ]).session(session);

  const data = summary || {
    totalWorkMinutes: 0,
    totalBilledAmount: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
    lastWorkDate: null,
  };

  await Farmer.updateOne(
    {
      _id: farmerId,
      owner: ownerId,
    },
    {
      $set: {
        totalWorkMinutes: data.totalWorkMinutes,
        totalBilledAmount: data.totalBilledAmount,
        totalPaidAmount: data.totalPaidAmount,
        totalDueAmount: data.totalDueAmount,
        lastWorkDate: data.lastWorkDate,
      },
    },
    { session }
  );

  return data;
};


/**
 * Recalculate farmer totals from all their work records.
 * Advance remains separate and is NOT overwritten.
 */
// export const syncFarmerSummary = async (
//   farmerId,
//   ownerId,
//   session
// ) => {
//   const result = await WorkLog.aggregate([
//     {
//       $match: {
//         farmer: farmerId,
//         owner: ownerId,
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         totalWorkMinutes: { $sum: "$totalMinutes" },
//         totalBilledAmount: { $sum: "$totalAmount" },
//         totalPaidAmount: { $sum: "$paidAmount" },
//         totalDueAmount: { $sum: "$dueAmount" },
//         lastWorkDate: { $max: "$date" },
//       },
//     },
//   ]).session(session);

//   const totals = result[0] || {
//     totalWorkMinutes: 0,
//     totalBilledAmount: 0,
//     totalPaidAmount: 0,
//     totalDueAmount: 0,
//     lastWorkDate: null,
//   };

//   await Farmer.updateOne(
//     {
//       _id: farmerId,
//       owner: ownerId,
//     },
//     {
//       $set: {
//         totalWorkMinutes: totals.totalWorkMinutes,
//         totalBilledAmount: totals.totalBilledAmount,
//         totalPaidAmount: totals.totalPaidAmount,
//         totalDueAmount: totals.totalDueAmount,
//         lastWorkDate: totals.lastWorkDate,
//       },
//     },
//     { session }
//   );

//   return totals;
// };
