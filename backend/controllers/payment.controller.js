
import mongoose from "mongoose";

import Payment from "../models/payment.model.js";
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import User from "../models/user.model.js";

import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";
import FarmerAdvanceAllocation from "../models/farmerAdvanceAllocation.model.js";
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

// payment.controller.js me purane getPaymentRecords ki jagah ye poora function paste karo

// payment.controller.js me purane getPaymentRecords ki jagah ye poora function paste karo

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
      advanceOnly,
    } = req.query;

    const currentPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const pageLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    const filter = { owner };

    if (status) {
      filter.status = String(status).toUpperCase();
    }

    if (paymentMethod) {
      filter.paymentMethod = String(
        paymentMethod
      ).toUpperCase();
    }

    // Sirf wo payments jinme advance jama hua (alag advance + zyada payment ka extra)
    if (advanceOnly === "true") {
      filter.advanceAmount = { $gt: 0 };
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

    // YYYY-MM-DD ko IST (Asia/Kolkata) din ki seema me badlo,
    // warna server UTC ke hisaab se raat ke payments galat din me jaate hain.
    const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
    const DAY_MS = 24 * 60 * 60 * 1000;

    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        const start = DATE_ONLY.test(String(fromDate))
          ? new Date(`${fromDate}T00:00:00+05:30`)
          : new Date(fromDate);

        if (Number.isNaN(start.getTime())) {
          throw httpError("Invalid fromDate.", 400);
        }

        filter.paymentDate.$gte = start;
      }

      if (toDate) {
        if (DATE_ONLY.test(String(toDate))) {
          const dayStart = new Date(`${toDate}T00:00:00+05:30`);

          if (Number.isNaN(dayStart.getTime())) {
            throw httpError("Invalid toDate.", 400);
          }

          // to-date ka poora IST din shamil
          filter.paymentDate.$lt = new Date(
            dayStart.getTime() + DAY_MS
          );
        } else {
          const end = new Date(toDate);

          if (Number.isNaN(end.getTime())) {
            throw httpError("Invalid toDate.", 400);
          }

          filter.paymentDate.$lte = end;
        }
      }
    }

    // aggregate() string IDs ko ObjectId me cast nahi karta,
    // isliye summary ke liye alag filter jisme IDs cast hon.
    const toObjectId = (id) => new mongoose.Types.ObjectId(id);

    const matchFilter = { ...filter, owner: toObjectId(owner) };

    for (const key of ["farmerID", "driverID", "workId"]) {
      if (matchFilter[key]) {
        matchFilter[key] = toObjectId(matchFilter[key]);
      }
    }

    const skip = (currentPage - 1) * pageLimit;

    const [
      payments,
      totalRecords,
      [summary = {}],
    ] = await Promise.all([
      Payment.find(filter)
        .populate("farmerID", "name phone village")
        .populate("driverID", "name phone")
        .populate("workId", "date totalAmount paidAmount dueAmount")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Payment.countDocuments(filter),

      Payment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,

            totalAmount: {
              $sum: "$amount",
            },

            totalAppliedAmount: {
              $sum: "$appliedAmount",
            },

            totalAdvanceAmount: {
              $sum: "$advanceAmount",
            },

            successfulAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "SUCCESS"] },
                  "$amount",
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

    // Jin payments me advance jama hua, unka hisaab: diya / use hua / bacha
    const advancePaymentIds = payments
      .filter((p) => Number(p.advanceAmount || 0) > 0)
      .map((p) => p._id);

    const advanceLots = advancePaymentIds.length
      ? await FarmerAdvanceLot.find({
          owner,
          paymentId: { $in: advancePaymentIds },
        })
          .select("paymentId originalAmount remainingAmount status")
          .lean()
      : [];

    const lotByPayment = new Map(
      advanceLots.map((lot) => [String(lot.paymentId), lot])
    );

    const paymentsWithAdvance = payments.map((payment) => {
      const lot = lotByPayment.get(String(payment._id));

      if (!lot) return payment;

      const given = round2(lot.originalAmount || 0);
      const reversed = lot.status === "REVERSED";
      const remaining = reversed ? 0 : round2(lot.remainingAmount || 0);

      return {
        ...payment,
        advanceInfo: {
          given,
          remaining,
          used: reversed ? 0 : round2(given - remaining),
          reversed,
        },
      };
    });

    return res.status(200).json({
      success: true,
      payments: paymentsWithAdvance,
      summary: {
        totalAmount: round2(summary.totalAmount || 0),
        totalAppliedAmount: round2(
          summary.totalAppliedAmount || 0
        ),
        totalAdvanceAmount: round2(
          summary.totalAdvanceAmount || 0
        ),
        successfulAmount: round2(
          summary.successfulAmount || 0
        ),
        successfulCount: summary.successfulCount || 0,
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
    return handleError(
      res,
      error,
      "Failed to fetch payment records."
    );
  }
};

// import mongoose from "mongoose";

// payment.controller.js me purane getPaymentRecords ki jagah ye poora function paste karo


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

//     const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
//     const pageLimit = Math.min(
//       100,
//       Math.max(1, Number.parseInt(limit, 10) || 10)
//     );

//     const validFarmer = farmerID && isValidId(farmerID);
//     const validDriver = driverID && isValidId(driverID);
//     const validWork = workId && isValidId(workId);

//     // Date range (IST)
//     const dateFilter = {};

//     if (fromDate || toDate) {
//       const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
//       const DAY_MS = 86400000;

//       if (fromDate) {
//         const start = DATE_ONLY.test(String(fromDate))
//           ? new Date(`${fromDate}T00:00:00+05:30`)
//           : new Date(fromDate);

//         if (Number.isNaN(start.getTime())) {
//           throw httpError("Invalid fromDate", 400);
//         }

//         dateFilter.$gte = start;
//       }

//       if (toDate) {
//         const end = DATE_ONLY.test(String(toDate))
//           ? new Date(
//               new Date(`${toDate}T00:00:00+05:30`).getTime() + DAY_MS
//             )
//           : new Date(toDate);

//         if (Number.isNaN(end.getTime())) {
//           throw httpError("Invalid toDate", 400);
//         }

//         if (DATE_ONLY.test(String(toDate))) {
//           dateFilter.$lt = end;
//         } else {
//           dateFilter.$lte = end;
//         }
//       }
//     }

//     // ---------------------------------
//     // 1. Actual Payment records
//     // ---------------------------------

//     const paymentFilter = { owner };

//     if (status) {
//       paymentFilter.status = String(status).toUpperCase();
//     }

//     if (paymentMethod) {
//       paymentFilter.paymentMethod = String(
//         paymentMethod
//       ).toUpperCase();
//     }

//     if (validFarmer) paymentFilter.farmerID = farmerID;
//     if (validDriver) paymentFilter.driverID = driverID;
//     if (validWork) paymentFilter.workId = workId;

//     if (Object.keys(dateFilter).length) {
//       paymentFilter.paymentDate = dateFilter;
//     }

//     // ---------------------------------
//     // 2. Advance adjustment records
//     // ---------------------------------

//     const allocationFilter = {
//       owner,
//       status: "ACTIVE",
//     };

//     // Only successful transactions are represented
//     // as completed advance adjustments.
//     if (status && String(status).toUpperCase() !== "SUCCESS") {
//       allocationFilter._id = { $exists: false };
//     }

//     // Advance adjustment has no cash/UPI method.
//     if (paymentMethod) {
//       allocationFilter._id = { $exists: false };
//     }

//     if (validFarmer) {
//       allocationFilter.farmerID = farmerID;
//     }

//     if (validWork) {
//       allocationFilter.workId = workId;
//     }

//     if (Object.keys(dateFilter).length) {
//       allocationFilter.createdAt = dateFilter;
//     }

//     // ---------------------------------
//     // 3. Fetch both collections
//     // ---------------------------------

//     const [payments, allocations, summary] = await Promise.all([
//       Payment.find(paymentFilter)
//         .populate("farmerID", "name phone village")
//         .populate("driverID", "name phone")
//         .populate("workId", "date totalAmount paidAmount dueAmount")
//         .sort({ paymentDate: -1, createdAt: -1 })
//         .lean(),

//       FarmerAdvanceAllocation.find(allocationFilter)
//         .populate("farmerID", "name phone village")
//         .populate("workId", "date totalAmount paidAmount dueAmount")
//         .sort({ createdAt: -1 })
//         .lean(),

//       Payment.aggregate([
//         {
//           $match: {
//             ...paymentFilter,
//             owner: new mongoose.Types.ObjectId(owner),
//             ...(validFarmer
//               ? { farmerID: new mongoose.Types.ObjectId(farmerID) }
//               : {}),
//             ...(validDriver
//               ? { driverID: new mongoose.Types.ObjectId(driverID) }
//               : {}),
//             ...(validWork
//               ? { workId: new mongoose.Types.ObjectId(workId) }
//               : {}),
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             totalAmount: { $sum: "$amount" },
//             appliedAmount: { $sum: "$appliedAmount" },
//             advanceAmount: { $sum: "$advanceAmount" },
//             count: { $sum: 1 },
//           },
//         },
//       ]),
//     ]);

//     // ---------------------------------
//     // 4. Convert allocations to records
//     // ---------------------------------

//     const advanceRecords = allocations.map((allocation) => ({
//       _id: `ADV-${allocation._id}`,

//       recordType: "ADVANCE_ADJUSTMENT",

//       farmerID: allocation.farmerID,
//       driverID: null,
//       workId: allocation.workId,

//       amount: Number(allocation.amount || 0),
//       appliedAmount: Number(allocation.amount || 0),
//       advanceAmount: 0,

//       paymentMethod: "ADVANCE",
//       status: "SUCCESS",

//       paymentDate: allocation.createdAt,
//       createdAt: allocation.createdAt,

//       sourcePaymentId: allocation.sourcePaymentId,
//       allocationId: allocation._id,

//       transactionId: `ADV-${String(allocation._id).slice(-8)}`,

//       note: "Due adjusted from existing farmer advance balance",
//     }));

//     // ---------------------------------
//     // 5. Merge and paginate
//     // ---------------------------------

//     const allRecords = [
//       ...payments.map((payment) => ({
//         ...payment,
//         recordType: "PAYMENT",
//       })),
//       ...advanceRecords,
//     ].sort(
//       (a, b) =>
//         new Date(b.paymentDate || b.createdAt).getTime() -
//         new Date(a.paymentDate || a.createdAt).getTime()
//     );

//     const totalRecords = allRecords.length;

//     const skip = (currentPage - 1) * pageLimit;

//     const paginatedRecords = allRecords.slice(
//       skip,
//       skip + pageLimit
//     );

//     const paymentSummary = summary[0] || {};

//     return res.status(200).json({
//       success: true,

//       payments: paginatedRecords,

//       summary: {
//         totalAmount: round2(paymentSummary.totalAmount || 0),
//         appliedAmount: round2(paymentSummary.appliedAmount || 0),
//         advanceAmount: round2(paymentSummary.advanceAmount || 0),
//         count: paymentSummary.count || 0,
//       },

//       pagination: {
//         currentPage,
//         limit: pageLimit,
//         total: totalRecords,
//         totalRecords,
//         pages: Math.ceil(totalRecords / pageLimit),
//         totalPages: Math.ceil(totalRecords / pageLimit),
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



// payment.controller.js me purane receiveFarmerAdvance ki jagah ye poora function paste karo.
// Naya body field: clearOldDueFirst (true/false). Default false = pehle jaisa behaviour.
// true = pehle farmer ke purane (STOPPED) works ka due FIFO (purana pehle) chukta hai,
//        bacha hua paisa hi advance lot me jaata hai.

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

    const clearOldDueFirst =
      req.body.clearOldDueFirst === true ||
      req.body.clearOldDueFirst === "true";

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    if (!farmerID || !isValidId(farmerID)) {
      throw httpError("Valid farmer ID is required.", 400);
    }

    const receivedAmount = round2(amount);

    if (
      !Number.isFinite(receivedAmount) ||
      receivedAmount <= 0
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

      let remaining = receivedAmount;
      const clearedDues = [];

      // -----------------------------------------
      // STEP 1 (optional): purana due pehle chukao
      // Oldest work first. Sirf STOPPED works, taaki
      // chalte hue kaam ka abhi ka due na chhua jaye.
      // -----------------------------------------

      if (clearOldDueFirst) {
        const dueWorks = await WorkLog.find({
          owner,
          farmer: farmer._id,
          status: "STOPPED",
          dueAmount: { $gt: 0 },
        })
          .sort({ date: 1, _id: 1 })
          .session(session);

        for (const work of dueWorks) {
          if (remaining <= 0) break;

          const totalAmount = round2(work.totalAmount || 0);
          const currentPaid = round2(work.paidAmount || 0);
          const due = Math.max(
            0,
            round2(totalAmount - currentPaid)
          );

          const applied = round2(Math.min(remaining, due));

          if (applied <= 0) continue;

          work.paidAmount = round2(currentPaid + applied);
          work.dueAmount = Math.max(
            0,
            round2(totalAmount - work.paidAmount)
          );
          work.paymentStatus = getPaymentStatus(
            work.paidAmount,
            work.dueAmount
          );

          await work.save({ session });

          const [workPayment] = await Payment.create(
            [
              {
                owner,
                driverID: null,
                farmerID: farmer._id,
                workId: work._id,
                paymentType: "WORK_PAYMENT",

                amount: applied,
                appliedAmount: applied,
                advanceAmount: 0,

                paymentMethod: method,
                status: "SUCCESS",

                transactionId: `ADVDUE-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 8)
                  .toUpperCase()}`,

                note: note
                  ? `${note} (old due cleared from advance receipt)`
                  : "Old due cleared from advance receipt",
                dueAmount: work.dueAmount,
                paymentDate: new Date(),
              },
            ],
            { session }
          );

          clearedDues.push({
            workId: work._id,
            paymentId: workPayment._id,
            applied,
            remainingDue: work.dueAmount,
          });

          remaining = round2(remaining - applied);
        }
      }

      const totalDueCleared = round2(
        receivedAmount - remaining
      );

      // -----------------------------------------
      // STEP 2: jo bacha wo advance (FIFO lot)
      // -----------------------------------------

      let payment = null;
      let lot = null;

      if (remaining > 0) {
        farmer.advanceAmount = round2(
          Number(farmer.advanceAmount || 0) + remaining
        );

        await farmer.save({ session });

        [payment] = await Payment.create(
          [
            {
              owner,
              driverID: null,
              farmerID: farmer._id,
              workId: null,
              paymentType: "ADVANCE",

              amount: remaining,
              appliedAmount: 0,
              advanceAmount: remaining,

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

        lot = await createAdvanceLot({
          farmer,
          owner,
          amount: remaining,
          paymentId: payment._id,
          sourceType: "PAYMENT",
          description: `Advance received from farmer through payment ${payment._id}`,
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
        advanceLot: lot,
        farmerAdvance: farmer.advanceAmount,
        received: receivedAmount,
        dueCleared: totalDueCleared,
        advanceCredited: remaining,
        clearedDues,
        summary,
      };
    });

    const message =
      responseData.dueCleared > 0
        ? responseData.advanceCredited > 0
          ? `₹${responseData.dueCleared} purana due clear hua, ₹${responseData.advanceCredited} advance me jama hua.`
          : `₹${responseData.dueCleared} purana due clear hua.`
        : "Farmer advance received successfully.";

    return res.status(201).json({
      success: true,
      message,
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
