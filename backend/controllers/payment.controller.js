
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import User from "../models/user.model.js";

export const addPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      driverID,
      workId,
      amount,
      paymentMethod,
      note,
    } = req.body;

    const owner = req.user.ownerId || req.user.userId;

    // =========================
    // 1. VALIDATION
    // =========================

    if (
      !driverID ||
      !workId ||
      amount === undefined ||
      amount === null ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(driverID) ||
      !mongoose.Types.ObjectId.isValid(workId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid driverID or workId",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    if (!["CASH", "UPI", "CARD", "BANK"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    let payment;
    let work;

    let appliedAmount = 0;
    let advanceAmount = 0;

    // =========================
    // 2. DATABASE TRANSACTION
    // =========================

    await session.withTransaction(async () => {

      // -------------------------
      // DRIVER CHECK
      // -------------------------

      const driver = await User.findById(driverID).session(session);

      if (!driver) {
        throw Object.assign(
          new Error("Driver not found"),
          { statusCode: 404 }
        );
      }

      // -------------------------
      // WORK CHECK
      // -------------------------

      work = await WorkLog.findById(workId).session(session);

      if (!work) {
        throw Object.assign(
          new Error("Work not found"),
          { statusCode: 404 }
        );
      }

      // -------------------------
      // CALCULATE PAYMENT
      // -------------------------

      const previousDue = Math.max(
        0,
        Number(work.dueAmount) || 0
      );

      // Amount applied to current work
      appliedAmount = Math.min(
        paymentAmount,
        previousDue
      );

      // Extra amount saved as advance
      advanceAmount = paymentAmount - appliedAmount;

      // -------------------------
      // UPDATE WORK
      // -------------------------

      work.paidAmount =
        (Number(work.paidAmount) || 0) + appliedAmount;

      work.dueAmount = Math.max(
        0,
        previousDue - appliedAmount
      );

      work.paymentStatus =
        work.dueAmount === 0 ? "paid" : "partial";

      await work.save({ session });

      // -------------------------
      // CREATE PAYMENT
      // -------------------------

      const createdPayment = await Payment.create(
        [
          {
            owner,
            driverID,
            farmerID: work.farmer,
            workId: work._id,

            // Actual amount received
            amount: paymentAmount,

            // Remaining work due
            dueAmount: work.dueAmount,

            paymentMethod,

            transactionId: `TXN${Date.now()}${Math.floor(
              Math.random() * 1000
            )}`,

            note,
            status: "SUCCESS",
          },
        ],
        { session }
      );

      payment = createdPayment[0];

      // -------------------------
      // UPDATE FARMER TOTALS
      // -------------------------

      const farmerUpdate = await Farmer.findByIdAndUpdate(
        work.farmer,
        {
          $inc: {
            totalPaidAmount: appliedAmount,
            totalDueAmount: -appliedAmount,
            advanceAmount: advanceAmount,
          },
        },
        {
          session,
          new: true,
        }
      );

      if (!farmerUpdate) {
        throw Object.assign(
          new Error("Farmer not found"),
          { statusCode: 404 }
        );
      }
    });

    // =========================
    // 3. SUCCESS RESPONSE
    // =========================

    return res.status(201).json({
      success: true,

      message:
        advanceAmount > 0
          ? "Payment added successfully. Extra amount saved as advance."
          : "Payment added successfully",

      payment,
      work,

      summary: {
        receivedAmount: paymentAmount,
        appliedAmount,
        advanceAmount,
        remainingDue: work.dueAmount,
        paymentStatus: work.paymentStatus,
      },
    });

  } catch (err) {

    console.error("========== ADD PAYMENT ERROR ==========");
    console.error(err);
    console.error("========================================");

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });

  } finally {
    await session.endSession();
  }
};