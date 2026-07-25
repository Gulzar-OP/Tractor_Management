import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import WorkLog from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import User from "../models/user.model.js";

export const addPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { driverID, workId, amount, paymentMethod, note } = req.body;
    const owner = req.user.ownerId || req.user.userId;
    // Validation
    if (!driverID || !workId || amount === undefined || amount === null || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(driverID) || !mongoose.Types.ObjectId.isValid(workId)) {
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

    let payment, work;

    await session.withTransaction(async () => {
      // Driver Check
      const driver = await User.findById(driverID).session(session);
      if (!driver) {
        throw Object.assign(new Error("Driver not found"), { statusCode: 404 });
      }

      // Work Check (lock the row for this transaction)
      work = await WorkLog.findById(workId).session(session);
      if (!work) {
        throw Object.assign(new Error("Work not found"), { statusCode: 404 });
      }

      // Prevent Overpayment
      if (paymentAmount > work.dueAmount) {
        throw Object.assign(
          new Error(`Payment exceeds due amount. Remaining due ₹${work.dueAmount}`),
          { statusCode: 400 }
        );
      }

      // Update Work
      work.paidAmount += paymentAmount;
      work.dueAmount -= paymentAmount;
      work.paymentStatus = work.dueAmount <= 0 ? "paid" : "partial";
      if (work.dueAmount < 0) work.dueAmount = 0;

      await work.save({ session });

      // Create Payment
      const created = await Payment.create(
        [
          {
            owner,
            driverID,
            farmerID: work.farmer,
            workId: work._id,
            amount: paymentAmount,
            dueAmount: work.dueAmount,
            paymentMethod,
            transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
            note,
            status: "SUCCESS",
          },
        ],
        { session }
      );
      payment = created[0];

      // Update Farmer totals
      const farmerUpdate = await Farmer.findByIdAndUpdate(
        work.farmer,
        {
          $inc: {
            totalPaidAmount: paymentAmount,
            totalDueAmount: -paymentAmount,
          },
        },
        { session, new: true }
      );

      if (!farmerUpdate) {
        throw Object.assign(new Error("Farmer not found"), { statusCode: 404 });
      }
    });

    return res.status(201).json({
      success: true,
      message: "Payment added successfully",
      payment,
      work,
    });
  } catch (err) {
    console.error(err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};