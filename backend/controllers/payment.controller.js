
import mongoose from "mongoose";

import Payment from "../models/payment.model.js";
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import User from "../models/user.model.js";

import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";

import {
  syncFarmerSummary,
  recordAdvanceMovement,
  createAdvanceLot,
} from "../utils/workAccounting.js";

// =====================================================
// COMMON HELPERS
// =====================================================

const round2 = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getOwner = (req) =>
  req.user?.ownerId || req.user?.userId;

const httpError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });
};

const getPaymentStatus = (paidAmount, dueAmount) => {
  if (dueAmount <= 0) return "paid";
  if (paidAmount > 0) return "partial";
  return "due";
};


// =====================================================
// ADVANCE LOT HELPERS
// =====================================================

/**
 * Get the original advance lot created by a payment.
 *
 * A payment's advance can only be reversed if its
 * complete original amount is still available.
 */
const getReversibleAdvanceLot = async ({
  payment,
  owner,
  farmer,
  session,
}) => {
  const advanceAmount = round2(
    payment.advanceAmount || 0
  );

  if (advanceAmount <= 0) {
    return null;
  }

  const lot = await FarmerAdvanceLot.findOne({
    owner,
    farmerID: farmer._id,
    paymentId: payment._id,
    sourceType: "PAYMENT",
    status: "ACTIVE",
  })
    .sort({ createdAt: -1 })
    .session(session);

  if (!lot) {
    throw httpError(
      "Active advance source lot not found. Reconciliation required.",
      409
    );
  }

  const originalAmount = round2(
    lot.originalAmount || 0
  );

  const remainingAmount = round2(
    lot.remainingAmount || 0
  );

  if (
    Math.abs(originalAmount - advanceAmount) > 0.01
  ) {
    throw httpError(
      "Payment advance and source lot do not match. Reconciliation required.",
      409
    );
  }

  if (
    Math.abs(remainingAmount - advanceAmount) > 0.01
  ) {
    throw httpError(
      `This payment's advance has already been consumed. Available: ₹${remainingAmount.toFixed(2)}, original: ₹${advanceAmount.toFixed(2)}.`,
      409
    );
  }

  return lot;
};


/**
 * Reverse an unconsumed payment advance.
 *
 * Farmer balance is updated and saved before recording
 * the corresponding DEBIT ledger movement.
 */
const reversePaymentAdvance = async ({
  payment,
  farmer,
  lot,
  owner,
  session,
}) => {
  const amount = round2(
    payment.advanceAmount || 0
  );

  if (amount <= 0) return;

  if (!lot) {
    throw httpError(
      "Advance lot is required for reversal.",
      409
    );
  }

  if (
    lot.status !== "ACTIVE" ||
    String(lot.paymentId) !== String(payment._id) ||
    String(lot.farmerID) !== String(farmer._id)
  ) {
    throw httpError(
      "Invalid or already reversed advance source lot.",
      409
    );
  }

  if (
    Math.abs(
      round2(lot.remainingAmount) - amount
    ) > 0.01
  ) {
    throw httpError(
      "Advance has already been consumed. Cannot reverse this payment.",
      409
    );
  }

  if (
    Number(farmer.advanceAmount || 0) + 0.001 < amount
  ) {
    throw httpError(
      "Insufficient farmer advance balance to reverse this payment.",
      409
    );
  }

  farmer.advanceAmount = round2(
    Number(farmer.advanceAmount || 0) - amount
  );

  await farmer.save({ session });

  lot.remainingAmount = 0;
  lot.status = "REVERSED";

  await lot.save({ session });

  await recordAdvanceMovement({
    farmer,
    owner,
    type: "DEBIT",
    amount,
    paymentId: payment._id,
    description: `Advance reversed for payment ${payment._id}`,
    referenceId: `REVERSE-PAYMENT-${payment._id}`,
    session,
  });
};


// =====================================================
// ADD PAYMENT
// =====================================================

export const addPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = getOwner(req);

    const {
      driverID,
      workId,
      amount,
      paymentMethod,
      note,
    } = req.body;

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    if (!driverID || !workId || amount === undefined || !paymentMethod) {
      throw httpError(
        "Driver, work, amount and payment method are required.",
        400
      );
    }

    if (!isValidId(driverID) || !isValidId(workId)) {
      throw httpError("Invalid driver or work ID.", 400);
    }

    const paymentAmount = round2(amount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      throw httpError(
        "Payment amount must be greater than zero.",
        400
      );
    }

    const method = String(paymentMethod).toUpperCase();

    if (!["CASH", "UPI", "CARD", "BANK"].includes(method)) {
      throw httpError("Invalid payment method.", 400);
    }

    let responseData;

    await session.withTransaction(async () => {
      // -----------------------------------------
      // Validate driver
      // -----------------------------------------

      // const driver = await User.findOne({
      //   _id: driverID,
      //   owner,
      //   role: "driver",
      // }).session(session);

      // if (!driver) {
      //   throw httpError(
      //     "Driver not found or unauthorized.",
      //     404
      //   );
      // }

      // -----------------------------------------
      // Find work and farmer
      // -----------------------------------------

      const work = await WorkLog.findOne({
        _id: workId,
        owner,
      }).session(session);

      if (!work) {
        throw httpError("Work not found.", 404);
      }

      const farmer = await Farmer.findOne({
        _id: work.farmer,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found.", 404);
      }

      // -----------------------------------------
      // Calculate payment allocation
      // -----------------------------------------

      const totalAmount = round2(
        work.totalAmount || 0
      );

      const currentPaid = round2(
        work.paidAmount || 0
      );

      const previousDue = Math.max(
        0,
        round2(totalAmount - currentPaid)
      );

      const appliedAmount = round2(
        Math.min(paymentAmount, previousDue)
      );

      const advanceAmount = round2(
        paymentAmount - appliedAmount
      );

      // -----------------------------------------
      // Update work
      // -----------------------------------------

      work.paidAmount = round2(
        currentPaid + appliedAmount
      );

      work.dueAmount = Math.max(
        0,
        round2(totalAmount - work.paidAmount)
      );

      work.paymentStatus = getPaymentStatus(
        work.paidAmount,
        work.dueAmount
      );

      await work.save({ session });

      // -----------------------------------------
      // Create payment
      // -----------------------------------------

      const [payment] = await Payment.create(
        [
          {
            owner,
            driverID,
            farmerID: farmer._id,
            workId: work._id,
            amount: paymentAmount,
            appliedAmount,
            advanceAmount,
            paymentMethod: method,
            status: "SUCCESS",
            paymentType: "WORK_PAYMENT",
            transactionId: `TXN-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)
              .toUpperCase()}`,
            note: note || "",
            dueAmount: work.dueAmount,
            paymentDate: new Date(),
          },
        ],
        { session }
      );

      // -----------------------------------------
      // Create source-wise advance lot
      // -----------------------------------------

      if (advanceAmount > 0) {
        farmer.advanceAmount = round2(
          Number(farmer.advanceAmount || 0) +
          advanceAmount
        );

        await farmer.save({ session });

        await createAdvanceLot({
          farmer,
          owner,
          amount: advanceAmount,
          paymentId: payment._id,
          description: `Advance received through payment ${payment._id}`,
          session,
        });
      }

      // -----------------------------------------
      // Sync farmer summary
      // -----------------------------------------

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      responseData = {
        payment,
        work,
        farmerAdvance: farmer.advanceAmount,
        summary,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Payment added successfully.",
      ...responseData,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to add payment."
    );
  } finally {
    await session.endSession();
  }
};


// =====================================================
// DELETE PAYMENT
// =====================================================


export const deletePayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = getOwner(req);
    const { id } = req.params;

    if (!owner) {
      throw httpError("Unauthorized",401);
    }

    if (!isValidId(id)) {
      throw httpError("Invalid payment ID",400);
    }

    let responseData = null;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: id,
        owner,
        status: "SUCCESS",
      }).session(session);

      if (!payment) {
        throw httpError( "Successful payment not found",404);
      }

      const paymentType = payment.paymentType || "WORK_PAYMENT";

      // =================================================
      // CASE 1: INDEPENDENT FARMER ADVANCE PAYMENT
      // =================================================

      if (paymentType === "ADVANCE") {
        const farmer = await Farmer.findOne({
          _id: payment.farmerID,
          owner,
        }).session(session);

        if (!farmer) {
          throw httpError( "Farmer not found",404);
        }

        const lot = await getReversibleAdvanceLot({
          payment,
          owner,
          farmer,
          session,
        });

        // Reject if any amount from this advance lot
        // has already been consumed by future work.
        await reversePaymentAdvance({
          payment,
          farmer,
          lot,
          owner,
          session,
        });

        // Keep the payment record for audit history.
        payment.status = "REVERSED";
        payment.reversedAt = new Date();
        payment.reversedBy =
          req.user?.userId || req.user?._id || null;
        payment.reversalNote =
          "Farmer advance payment reversed";

        await payment.save({ session });

        const summary = await syncFarmerSummary(
          farmer._id,
          owner,
          session
        );

        responseData = {
          success: true,
          message: "Farmer advance payment reversed successfully",
          deleted: false,
          reversed: true,
          payment,
          farmer: {
            _id: farmer._id,
            name: farmer.name,
            advanceAmount: round2(farmer.advanceAmount || 0),
          },
          summary,
        };

        return;
      }

      // =================================================
      // CASE 2: NORMAL WORK PAYMENT
      // =================================================

      if (!payment.workId) {
        throw httpError(
          
          "Work payment does not have a linked work",400
        );
      }

      const work = await WorkLog.findOne({
        _id: payment.workId,
        owner,
      }).session(session);

      if (!work) {
        throw httpError("Linked work not found",404);
      }

      const farmer = await Farmer.findOne({
        _id: payment.farmerID,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError( "Farmer not found",404);
      }

      const appliedAmount = round2(
        Number(payment.appliedAmount || 0)
      );

      const advanceAmount = round2(
        Number(payment.advanceAmount || 0)
      );

      const paymentAmount = round2(
        Number(payment.amount || 0)
      );

      // Validate payment breakdown.
      if (
        Math.abs(
          round2(appliedAmount + advanceAmount) -
            paymentAmount
        ) > 0.01
      ) {
        throw httpError(
          
          "Payment accounting breakdown is inconsistent",409
        );
      }

      // Reverse advance only if this payment created one.
      let advanceLot = null;

      if (advanceAmount > 0) {
        advanceLot = await getReversibleAdvanceLot({
          payment,
          owner,
          farmer,
          session,
        });
      }

      // Reverse the advance lot and farmer balance.
      if (advanceLot) {
        await reversePaymentAdvance({
          payment,
          farmer,
          lot: advanceLot,
          owner,
          session,
        });
      }

      // Reverse the amount applied to work.
      const currentPaid = round2(
        Number(work.paidAmount || 0)
      );

      if (currentPaid + 0.01 < appliedAmount) {
        throw httpError(
          
          "Work paid amount is lower than this payment allocation",409
        );
      }

      work.paidAmount = round2(
        Math.max(0, currentPaid - appliedAmount)
      );

      const totalAmount = round2(
        Number(work.totalAmount || 0)
      );

      work.dueAmount = round2(
        Math.max(0, totalAmount - work.paidAmount)
      );

      work.paymentStatus = getPaymentStatus(
        work.paidAmount,
        totalAmount
      );

      await work.save({ session });

      // Permanently delete normal work payment.
      await Payment.deleteOne(
        { _id: payment._id, owner },
        { session }
      );

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      responseData = {
        success: true,
        message: "Payment deleted and accounting reversed successfully",
        deleted: true,
        paymentId: payment._id,
        reversed: {
          appliedAmount,
          advanceAmount,
          totalAmount: paymentAmount,
        },
        work: {
          _id: work._id,
          paidAmount: work.paidAmount,
          dueAmount: work.dueAmount,
          paymentStatus: work.paymentStatus,
        },
        farmer: {
          _id: farmer._id,
          advanceAmount: round2(
            farmer.advanceAmount || 0
          ),
        },
        summary,
      };
    });

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Delete payment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete payment",
    });
  } finally {
    await session.endSession();
  }
};



// =====================================================
// UPDATE PAYMENT
// =====================================================


export const updatePayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = getOwner(req);
    const { id } = req.params;

    const { amount, paymentMethod, note } = req.body;

    if (!owner) {
      throw httpError("Unauthorized",401);
    }

    if (!isValidId(id)) {
      throw httpError("Invalid payment ID",400);
    }

    const newAmount = round2(Number(amount));

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw httpError( "Amount must be greater than zero",400);
    }

    const allowedMethods = [
      "CASH",
      "UPI",
      "CARD",
      "BANK",
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      throw httpError("Invalid payment method",400);
    }

    let responseData = null;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: id,
        owner,
        status: "SUCCESS",
      }).session(session);

      if (!payment) {
        throw httpError( "Successful payment not found",404);
      }

      const paymentType = payment.paymentType || "WORK_PAYMENT";

      // =================================================
      // CASE 1: UPDATE INDEPENDENT FARMER ADVANCE
      // =================================================

      if (paymentType === "ADVANCE") {
        const farmer = await Farmer.findOne({
          _id: payment.farmerID,
          owner,
        }).session(session);

        if (!farmer) {
          throw httpError("Farmer not found",404);
        }

        const oldAmount = round2(
          Number(payment.amount || 0)
        );

        const oldAdvanceAmount = round2(
          Number(payment.advanceAmount || 0)
        );

        if (
          Math.abs(oldAmount - oldAdvanceAmount) > 0.01 ||
          Number(payment.appliedAmount || 0) > 0
        ) {
          throw httpError(
            
            "Invalid advance payment accounting breakdown",409
          );
        }

        // Find the original active advance lot.
        const oldLot = await getReversibleAdvanceLot({
          payment,
          owner,
          farmer,
          session,
        });

        // Reverse old advance.
        // This rejects if any part of the lot was consumed.
        await reversePaymentAdvance({
          payment,
          farmer,
          lot: oldLot,
          owner,
          session,
        });

        // Add new advance amount.
        farmer.advanceAmount = round2(
          Number(farmer.advanceAmount || 0) + newAmount
        );

        await farmer.save({ session });

        // Create a fresh lot for the updated payment.
        await createAdvanceLot({
          farmer,
          owner,
          amount: newAmount,
          paymentId: payment._id,
          sourceType: "PAYMENT",
          description: note || "Updated farmer advance payment",
          session,
        });

        payment.amount = newAmount;
        payment.appliedAmount = 0;
        payment.advanceAmount = newAmount;
        payment.paymentMethod = paymentMethod;
        payment.note = note || "";
        payment.dueAmount = 0;

        await payment.save({ session });

        const summary = await syncFarmerSummary(
          farmer._id,
          owner,
          session
        );

        const updatedPayment = await Payment.findById(
          payment._id
        )
          .populate("farmerID", "name phone")
          .session(session);

        responseData = {
          success: true,
          message: "Farmer advance payment updated successfully",
          payment: updatedPayment,
          farmer: {
            _id: farmer._id,
            name: farmer.name,
            advanceAmount: round2(
              farmer.advanceAmount || 0
            ),
          },
          summary,
        };

        return;
      }

      // =================================================
      // CASE 2: UPDATE NORMAL WORK PAYMENT
      // =================================================

      if (!payment.workId) {
        throw httpError(
          
          "Work payment does not have a linked work",400
        );
      }

      const work = await WorkLog.findOne({
        _id: payment.workId,
        owner,
      }).session(session);

      if (!work) {
        throw httpError("Linked work not found",404);
      }

      const farmer = await Farmer.findOne({
        _id: payment.farmerID,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found",404);
      }

      const oldAppliedAmount = round2(
        Number(payment.appliedAmount || 0)
      );

      const oldAdvanceAmount = round2(
        Number(payment.advanceAmount || 0)
      );

      const oldPaymentAmount = round2(
        Number(payment.amount || 0)
      );

      // Validate existing payment breakdown.
      if (
        Math.abs(
          round2(oldAppliedAmount + oldAdvanceAmount) -
            oldPaymentAmount
        ) > 0.01
      ) {
        throw httpError(
          
          "Existing payment accounting breakdown is inconsistent",409
        );
      }

      // Find old advance lot if this payment created advance.
      let oldLot = null;

      if (oldAdvanceAmount > 0) {
        oldLot = await getReversibleAdvanceLot({
          payment,
          owner,
          farmer,
          session,
        });
      }

      // Reverse old advance first.
      if (oldLot) {
        await reversePaymentAdvance({
          payment,
          farmer,
          lot: oldLot,
          owner,
          session,
        });
      }

      // Remove old payment allocation from work.
      const currentPaid = round2(
        Number(work.paidAmount || 0)
      );

      if (currentPaid + 0.01 < oldAppliedAmount) {
        throw httpError(
          
          "Work paid amount is lower than the existing payment allocation",409
        );
      }

      work.paidAmount = round2(
        Math.max(0, currentPaid - oldAppliedAmount)
      );

      const totalAmount = round2(
        Number(work.totalAmount || 0)
      );

      // Calculate outstanding due after reversing old payment.
      const outstandingDue = round2(
        Math.max(0, totalAmount - work.paidAmount)
      );

      // Allocate new amount to work due first.
      const newAppliedAmount = round2(
        Math.min(newAmount, outstandingDue)
      );

      // Remaining amount becomes farmer advance.
      const newAdvanceAmount = round2(
        Math.max(0, newAmount - newAppliedAmount)
      );

      // Update work paid and due.
      work.paidAmount = round2(
        work.paidAmount + newAppliedAmount
      );

      work.dueAmount = round2(
        Math.max(0, totalAmount - work.paidAmount)
      );

      work.paymentStatus = getPaymentStatus(
        work.paidAmount,
        totalAmount
      );

      await work.save({ session });

      // Add new advance amount if payment exceeds work due.
      if (newAdvanceAmount > 0) {
        farmer.advanceAmount = round2(
          Number(farmer.advanceAmount || 0) +
            newAdvanceAmount
        );

        await farmer.save({ session });

        await createAdvanceLot({
          farmer,
          owner,
          amount: newAdvanceAmount,
          paymentId: payment._id,
          sourceType: "PAYMENT",
          description:
            note || "Advance generated from updated work payment",
          session,
        });
      }

      // Update payment record.
      payment.amount = newAmount;
      payment.appliedAmount = newAppliedAmount;
      payment.advanceAmount = newAdvanceAmount;
      payment.paymentMethod = paymentMethod;
      payment.note = note || "";
      payment.dueAmount = work.dueAmount;
      payment.paymentType = "WORK_PAYMENT";

      await payment.save({ session });

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      const updatedPayment = await Payment.findById(
        payment._id
      )
        .populate("farmerID", "name phone")
        .populate("workId")
        .populate("driverID", "name phone")
        .session(session);

      responseData = {
        success: true,
        message: "Payment updated successfully",
        payment: updatedPayment,
        allocation: {
          oldAppliedAmount,
          oldAdvanceAmount,
          newAppliedAmount,
          newAdvanceAmount,
        },
        work: {
          _id: work._id,
          totalAmount,
          paidAmount: work.paidAmount,
          dueAmount: work.dueAmount,
          paymentStatus: work.paymentStatus,
        },
        farmer: {
          _id: farmer._id,
          advanceAmount: round2(
            farmer.advanceAmount || 0
          ),
        },
        summary,
      };
    });

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Update payment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update payment",
    });
  } finally {
    await session.endSession();
  }
};



// =====================================================
// GET PAYMENT RECORDS
// =====================================================

// export const getPaymentRecords = async (req, res) => {
//   try {
//     const owner = getOwner(req);

//     if (!owner) {
//       throw httpError("Unauthorized", 401);
//     }

//     const {
//       page = 1,
//       limit = 10,
//       status,
//       paymentMethod,
//       farmerID,
//       driverID,
//       workId,
//       fromDate,
//       toDate,
//     } = req.query;

//     const currentPage = Math.max(
//       1,
//       Number.parseInt(page, 10) || 1
//     );

//     const pageLimit = Math.min(
//       100,
//       Math.max(1, Number.parseInt(limit, 10) || 10)
//     );

//     const filter = { owner };

//     if (status) {
//       filter.status = String(status).toUpperCase();
//     }

//     if (paymentMethod) {
//       filter.paymentMethod = String(
//         paymentMethod
//       ).toUpperCase();
//     }

//     if (farmerID && isValidId(farmerID)) {
//       filter.farmerID = farmerID;
//     }

//     if (driverID && isValidId(driverID)) {
//       filter.driverID = driverID;
//     }

//     if (workId && isValidId(workId)) {
//       filter.workId = workId;
//     }

//     if (fromDate || toDate) {
//       filter.paymentDate = {};

//       if (fromDate) {
//         const start = new Date(fromDate);

//         if (Number.isNaN(start.getTime())) {
//           throw httpError("Invalid fromDate.", 400);
//         }

//         start.setHours(0, 0, 0, 0);
//         filter.paymentDate.$gte = start;
//       }

//       if (toDate) {
//         const end = new Date(toDate);

//         if (Number.isNaN(end.getTime())) {
//           throw httpError("Invalid toDate.", 400);
//         }

//         end.setHours(23, 59, 59, 999);
//         filter.paymentDate.$lte = end;
//       }
//     }

//     const skip = (currentPage - 1) * pageLimit;

//     const [
//       payments,
//       totalRecords,
//       [summary = {}],
//     ] = await Promise.all([
//       Payment.find(filter)
//         .populate("farmerID", "name phone village")
//         .populate("driverID", "name phone")
//         .populate("workId", "date totalAmount paidAmount dueAmount")
//         .sort({ paymentDate: -1, createdAt: -1 })
//         .skip(skip)
//         .limit(pageLimit)
//         .lean(),

//       Payment.countDocuments(filter),

//       Payment.aggregate([
//         { $match: filter },
//         {
//           $group: {
//             _id: null,

//             totalAmount: {
//               $sum: "$amount",
//             },

//             totalAppliedAmount: {
//               $sum: "$appliedAmount",
//             },

//             totalAdvanceAmount: {
//               $sum: "$advanceAmount",
//             },

//             successfulAmount: {
//               $sum: {
//                 $cond: [
//                   { $eq: ["$status", "SUCCESS"] },
//                   "$amount",
//                   0,
//                 ],
//               },
//             },

//             successfulCount: {
//               $sum: {
//                 $cond: [
//                   { $eq: ["$status", "SUCCESS"] },
//                   1,
//                   0,
//                 ],
//               },
//             },
//           },
//         },
//       ]),
//     ]);

//     return res.status(200).json({
//       success: true,
//       payments,
//       summary: {
//         totalAmount: round2(summary.totalAmount || 0),
//         totalAppliedAmount: round2(
//           summary.totalAppliedAmount || 0
//         ),
//         totalAdvanceAmount: round2(
//           summary.totalAdvanceAmount || 0
//         ),
//         successfulAmount: round2(
//           summary.successfulAmount || 0
//         ),
//         successfulCount: summary.successfulCount || 0,
//       },
//       pagination: {
//         currentPage,
//         limit: pageLimit,
//         totalRecords,
//         totalPages: Math.ceil(
//           totalRecords / pageLimit
//         ),
//       },
//     });
//   } catch (error) {
//     return handleError(
//       res,
//       error,
//       "Failed to fetch payment records."
//     );
//   }
// };

// import mongoose from "mongoose";

export const getPaymentRecords = async (req, res) => {
  try {
    const owner = getOwner(req);

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      farmerID,
      driverID,
      workId,
      fromDate,
      toDate,
    } = req.query;

    // Pagination
    const currentPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const pageLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    // 1. Normal MongoDB filter
    const filter = { owner };

    if (status) {
      filter.status = String(status).toUpperCase();
    }

    if (paymentMethod) {
      filter.paymentMethod = String(
        paymentMethod
      ).toUpperCase();
    }

    if (farmerID && isValidId(farmerID)) {
      filter.farmerID = farmerID;
    }

    if (driverID && isValidId(driverID)) {
      filter.driverID = driverID;
    }

    if (workId && isValidId(workId)) {
      filter.workId = workId;
    }

    // Date filter
    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        const start = new Date(fromDate);

        if (Number.isNaN(start.getTime())) {
          throw httpError("Invalid fromDate.", 400);
        }

        start.setHours(0, 0, 0, 0);
        filter.paymentDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);

        if (Number.isNaN(end.getTime())) {
          throw httpError("Invalid toDate.", 400);
        }

        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    // 2. Aggregation filter
    // Aggregate does not automatically cast string IDs.
    const aggregateFilter = { ...filter };

    const objectIdFields = [
      "owner",
      "farmerID",
      "driverID",
      "workId",
    ];

    for (const field of objectIdFields) {
      if (aggregateFilter[field]) {
        if (!mongoose.isValidObjectId(aggregateFilter[field])) {
          throw httpError(`Invalid ${field}.`, 400);
        }

        aggregateFilter[field] = new mongoose.Types.ObjectId(
          aggregateFilter[field]
        );
      }
    }

    const skip = (currentPage - 1) * pageLimit;

    // 3. Fetch records, count and summary
    const [
      payments,
      totalRecords,
      [summary = {}],
    ] = await Promise.all([
      // Payment records
      Payment.find(filter)
        .populate("farmerID", "name phone village")
        .populate("driverID", "name phone")
        .populate(
          "workId",
          "date totalAmount paidAmount dueAmount"
        )
        .sort({
          paymentDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      // Total records
      Payment.countDocuments(filter),

      // Payment summary
      Payment.aggregate([
        {
          $match: aggregateFilter,
        },

        {
          $group: {
            _id: null,

            totalAmount: {
              $sum: { $ifNull: ["$amount", 0] },
            },

            totalAppliedAmount: {
              $sum: { $ifNull: ["$appliedAmount", 0] },
            },

            totalAdvanceAmount: {
              $sum: { $ifNull: ["$advanceAmount", 0] },
            },

            successfulAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "SUCCESS"] },
                  { $ifNull: ["$amount", 0] },
                  0,
                ],
              },
            },

            successfulCount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "SUCCESS"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    // 4. Response
    return res.status(200).json({
      success: true,

      payments,

      summary: {
        totalAmount: round2(
          summary.totalAmount || 0
        ),

        totalAppliedAmount: round2(
          summary.totalAppliedAmount || 0
        ),

        totalAdvanceAmount: round2(
          summary.totalAdvanceAmount || 0
        ),

        successfulAmount: round2(
          summary.successfulAmount || 0
        ),

        successfulCount:
          summary.successfulCount || 0,
      },

      pagination: {
        currentPage,
        limit: pageLimit,
        totalRecords,

        totalPages: Math.ceil(
          totalRecords / pageLimit
        ),
      },
    });
  } catch (error) {
    console.error("getPaymentRecords error:", error);

    return handleError(
      res,
      error,
      "Failed to fetch payment records."
    );
  }
};


export const receiveFarmerAdvance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = getOwner(req);
    const {
      farmerID,
      amount,
      paymentMethod,
      note,
    } = req.body;

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    if (!farmerID || !isValidId(farmerID)) {
      throw httpError("Valid farmer ID is required.", 400);
    }

    const advanceAmount = round2(amount);

    if (
      !Number.isFinite(advanceAmount) ||
      advanceAmount <= 0
    ) {
      throw httpError(
        "Advance amount must be greater than zero.",
        400
      );
    }

    const method = String(paymentMethod || "").toUpperCase();

    if (!["CASH", "UPI", "CARD", "BANK"].includes(method)) {
      throw httpError("Invalid payment method.", 400);
    }

    let responseData;

    await session.withTransaction(async () => {
      const farmer = await Farmer.findOne({
        _id: farmerID,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found.", 404);
      }

      // -----------------------------------------
      // Add amount to farmer advance balance
      // -----------------------------------------

      farmer.advanceAmount = round2(
        Number(farmer.advanceAmount || 0) +
        advanceAmount
      );

      await farmer.save({ session });

      // -----------------------------------------
      // Create independent advance payment
      // -----------------------------------------

      const [payment] = await Payment.create(
        [
          {
            owner,
            driverID: null,
            farmerID: farmer._id,
            workId: null,
            paymentType: "ADVANCE",

            amount: advanceAmount,
            appliedAmount: 0,
            advanceAmount,

            paymentMethod: method,
            status: "SUCCESS",

            transactionId: `ADV-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)
              .toUpperCase()}`,

            note: note || "",
            dueAmount: 0,
            paymentDate: new Date(),
          },
        ],
        { session }
      );

      // -----------------------------------------
      // Create FIFO source lot + CREDIT ledger
      // -----------------------------------------

      const lot = await createAdvanceLot({
        farmer,
        owner,
        amount: advanceAmount,
        paymentId: payment._id,
        sourceType: "PAYMENT",
        description: `Advance received from farmer through payment ${payment._id}`,
        session,
      });

      // -----------------------------------------
      // Sync farmer summary
      // -----------------------------------------

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      responseData = {
        payment,
        advanceLot: lot,
        farmerAdvance: farmer.advanceAmount,
        summary,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Farmer advance received successfully.",
      ...responseData,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to receive farmer advance."
    );
  } finally {
    await session.endSession();
  }
};
