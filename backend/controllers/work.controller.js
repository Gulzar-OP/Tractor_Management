import mongoose from "mongoose";

import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import WorkRate from "../models/workRate.model.js";
import Payment from "../models/payment.model.js";

import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";

import {
  applyFarmerAdvance,
  syncFarmerSummary,
  restoreWorkAdvanceAllocations,
  recordAdvanceMovement,
} from "../utils/workAccounting.js";

// =====================================================
// COMMON HELPERS
// =====================================================

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const httpError = (message, statusCode = 500) =>
  Object.assign(new Error(message), { statusCode });

const handleError = (res, err, label) => {
  if (!err.statusCode) {
    console.error(`${label} error:`, err);
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.statusCode ? err.message : "Server error",
  });
};

const round2 = (number) =>
  Math.round(
    (Number(number || 0) + Number.EPSILON) * 100
  ) / 100;

const minutesSince = (date) => {
  if (!date) return 0;

  const elapsedSeconds = Math.max(
    0,
    (Date.now() - new Date(date).getTime()) / 1000
  );

  return Math.round((elapsedSeconds / 60) * 10000) / 10000;
};

const getOwner = (req) =>
  req.user?.ownerId || req.user?.userId;

const getPaymentStatus = (dueAmount, paidAmount) => {
  if (dueAmount <= 0) return "paid";
  if (paidAmount > 0) return "partial";
  return "due";
};

// Owner sees all work. Driver sees work under same owner.
export const scopeFilter = (req) => {
  const owner = getOwner(req);

  if (!owner) {
    throw httpError("Unauthorized", 401);
  }

  if (
    req.user.role === "owner" ||
    req.user.role === "driver"
  ) {
    return { owner };
  }

  throw httpError("Unauthorized access", 403);
};

// =====================================================
// GET RATE
// =====================================================

const getRate = async (workRateId, owner, session = null) => {
  if (!isValidId(workRateId)) {
    throw httpError("Invalid work rate ID", 400);
  }

  let query = WorkRate.findOne({
    _id: workRateId,
    owner,
  });

  if (session) query = query.session(session);

  const rate = await query;

  if (!rate) {
    throw httpError("Work rate not found", 404);
  }

  return rate;
};

// =====================================================
// GET FARMER
// =====================================================

const getFarmer = async (req, farmerId, session = null) => {
  if (!isValidId(farmerId)) {
    throw httpError("Invalid farmer ID", 400);
  }

  let query = Farmer.findOne({
    _id: farmerId,
    ...scopeFilter(req),
  });

  if (session) query = query.session(session);

  const farmer = await query;

  if (!farmer) {
    throw httpError("Farmer not found", 404);
  }

  return farmer;
};

// =====================================================
// GET WORK
// =====================================================

const getWork = async (req, session = null) => {
  if (!isValidId(req.params.id)) {
    throw httpError("Invalid work ID", 400);
  }

  let query = WorkLog.findOne({
    _id: req.params.id,
    ...scopeFilter(req),
  });

  if (session) query = query.session(session);

  const work = await query;

  if (!work) {
    throw httpError("Work not found", 404);
  }

  // Driver sirf apna shuru kiya hua kaam pause/resume/stop/cancel kar sakta hai.
  // Owner apne owner ke kisi bhi kaam par kaam kar sakta hai.
  if (
    req.user.role === "driver" &&
    String(work.createdBy) !== String(req.user.userId)
  ) {
    throw httpError("You can only manage your own work", 403);
  }

  return work;
};

// =====================================================
// REVERSE LINKED PAYMENT ADVANCE
// =====================================================

/**
 * Reverses the advance created by a payment linked
 * to the work being deleted.
 *
 * Deletion is blocked if any part of this payment's
 * advance has already been consumed by another work.
 */
const reverseLinkedPaymentAdvance = async ({
  payment,
  farmer,
  owner,
  session,
}) => {
  const advanceAmount = round2(
    payment.advanceAmount || 0
  );

  if (advanceAmount <= 0) {
    return 0;
  }

  const lot = await FarmerAdvanceLot.findOne({
    owner,
    farmerID: farmer._id,
    paymentId: payment._id,
    sourceType: "PAYMENT",
    status: "ACTIVE",
  }).session(session);

  if (!lot) {
    throw httpError(
      `Advance source lot missing for payment ${payment._id}. Reconciliation required.`,
      409
    );
  }

  const originalAmount = round2(
    lot.originalAmount
  );

  const remainingAmount = round2(
    lot.remainingAmount
  );

  if (
    Math.abs(originalAmount - advanceAmount) > 0.01
  ) {
    throw httpError(
      `Payment and advance lot mismatch for payment ${payment._id}.`,
      409
    );
  }

  if (
    Math.abs(remainingAmount - originalAmount) > 0.01
  ) {
    throw httpError(
      `Cannot delete work: advance of linked payment ${payment._id} has been consumed by another work. Restore that work's allocation first.`,
      409
    );
  }

  if (
    round2(farmer.advanceAmount) + 0.01 <
    advanceAmount
  ) {
    throw httpError(
      "Insufficient farmer advance balance to reverse linked payment.",
      409
    );
  }

  farmer.advanceAmount = round2(
    Number(farmer.advanceAmount || 0) -
    advanceAmount
  );

  await farmer.save({ session });

  lot.remainingAmount = 0;
  lot.status = "REVERSED";

  await lot.save({ session });

  await recordAdvanceMovement({
    farmer,
    owner,
    type: "DEBIT",
    amount: advanceAmount,
    paymentId: payment._id,
    description: `Advance reversed because linked work ${payment.workId} was deleted`,
    referenceId: `DELETE-WORK-PAYMENT-${payment._id}`,
    session,
  });

  return advanceAmount;
};

// =====================================================
// START WORK
// =====================================================

export const startWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      hourlyRate,
      description,
      workDate,
      farmerId,
      fieldName,
      workRate,
    } = req.body;

    const owner = getOwner(req);

    if (!farmerId) {
      throw httpError(
        "Farmer is required to start work",
        400
      );
    }

    if (!workRate && hourlyRate === undefined) {
      throw httpError("Hourly rate is required", 400);
    }

    const farmer = await getFarmer(req, farmerId);

    let ratePerHour = Number(hourlyRate);
    let rateDoc = null;

    if (workRate) {
      rateDoc = await getRate(workRate, owner);
      ratePerHour = Number(rateDoc.rate);
    }

    if (
      !Number.isFinite(ratePerHour) ||
      ratePerHour < 0
    ) {
      throw httpError("Invalid hourly rate", 400);
    }

    const date = workDate
      ? new Date(workDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      throw httpError("Invalid work date", 400);
    }

    let createdWork;

    await session.withTransaction(async () => {
      // Ek user ka ek hi chalta ya ruka hua kaam (double tap / 2 tab se bachav)
      const alreadyActive = await WorkLog.findOne({
        owner,
        createdBy: req.user.userId,
        status: { $in: ["RUNNING", "PAUSED"] },
      })
        .select("_id status")
        .session(session)
        .lean();

      if (alreadyActive) {
        throw httpError(
          `You already have a ${alreadyActive.status.toLowerCase()} work. Complete or cancel it first.`,
          409
        );
      }

      const now = new Date();

      const [work] = await WorkLog.create(
        [
          {
            createdBy: req.user.userId,
            owner,
            farmer: farmer._id,

            fieldName:
              fieldName || description || "General Work",

            workType: rateDoc?.type || "General",
            workRate: rateDoc?._id,
            ratePerHour,

            status: "RUNNING",

            startTime: now,
            lastResumeTime: now,

            totalMinutes: 0,
            totalAmount: 0,
            paidAmount: 0,
            advanceAppliedAmount: 0,
            dueAmount: 0,

            paymentStatus: "due",
            date,
          },
        ],
        { session }
      );

      await Farmer.updateOne(
        {
          _id: farmer._id,
          owner,
        },
        {
          $addToSet: {
            works: work._id,
          },
        },
        { session }
      );

      createdWork = work;
    });

    return res.status(201).json({
      success: true,
      message: "Work started successfully",
      work: createdWork,
      messageInfo:
        "Advance will be adjusted automatically when work is stopped and its amount is calculated.",
    });
  } catch (err) {
    return handleError(res, err, "startWork");
  } finally {
    await session.endSession();
  }
};

// =====================================================
// ADD COMPLETED WORK
// =====================================================

export const addWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      farmerId,
      fieldName,
      workRate,
      totalMinutes,
      startTime,
      date,
      paidAmount = 0,
    } = req.body;

    const owner = getOwner(req);

    if (!farmerId || !workRate) {
      throw httpError(
        "Farmer and work rate are required",
        400
      );
    }

    if (
      !isValidId(farmerId) ||
      !isValidId(workRate)
    ) {
      throw httpError(
        "Invalid farmer or work rate ID",
        400
      );
    }

    const minutes = Number(totalMinutes);
    const manualPaid = Number(paidAmount);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw httpError(
        "Total minutes must be greater than zero",
        400
      );
    }

    if (
      !Number.isFinite(manualPaid) ||
      manualPaid !== 0
    ) {
      throw httpError(
        "Do not send paidAmount while creating work. Add payment separately through the payment API.",
        400
      );
    }

    const start = startTime
      ? new Date(startTime)
      : null;

    if (start && Number.isNaN(start.getTime())) {
      throw httpError("Invalid start time", 400);
    }

    const workDate = date
      ? new Date(date)
      : new Date();

    if (Number.isNaN(workDate.getTime())) {
      throw httpError("Invalid work date", 400);
    }

    let result;

    await session.withTransaction(async () => {
      const farmer = await Farmer.findOne({
        _id: farmerId,
        ...scopeFilter(req),
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found", 404);
      }

      const rateDoc = await WorkRate.findOne({
        _id: workRate,
        owner,
      }).session(session);

      if (!rateDoc) {
        throw httpError("Work rate not found", 404);
      }

      const totalAmount = Math.ceil(
        (minutes / 60) * rateDoc.rate
      );

      const endTime = new Date();

      const [work] = await WorkLog.create(
        [
          {
            createdBy: req.user.userId,
            owner,
            farmer: farmer._id,

            fieldName,
            workType: rateDoc.type,
            workRate: rateDoc._id,
            ratePerHour: rateDoc.rate,

            startTime:
              start ||
              new Date(
                endTime.getTime() - minutes * 60000
              ),

            endTime,
            totalMinutes: round2(minutes),

            totalAmount,
            paidAmount: 0,
            advanceAppliedAmount: 0,
            dueAmount: totalAmount,

            paymentStatus:
              totalAmount === 0 ? "paid" : "due",

            status: "STOPPED",
            date: workDate,
          },
        ],
        { session }
      );

      await Farmer.updateOne(
        {
          _id: farmer._id,
          owner,
        },
        {
          $addToSet: {
            works: work._id,
          },
        },
        { session }
      );

      const advanceResult = await applyFarmerAdvance(
        work,
        session
      );

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      result = {
        work,
        summary: {
          workAmount: totalAmount,
          advanceApplied: advanceResult.applied,
          remainingDue: advanceResult.remainingDue,
          remainingAdvance: advanceResult.remainingAdvance,
          totalFarmerDue: summary.totalDueAmount,
        },
      };
    });

    return res.status(201).json({
      success: true,
      message:
        "Work added successfully. Advance adjusted automatically.",
      ...result,
    });
  } catch (err) {
    return handleError(res, err, "addWork");
  } finally {
    await session.endSession();
  }
};

// =====================================================
// PAUSE WORK
// =====================================================

export const pauseWork = async (req, res) => {
  try {
    const work = await getWork(req);

    if (work.status !== "RUNNING") {
      throw httpError(
        "Only running work can be paused",
        400
      );
    }

    const minutes = round2(
      minutesSince(work.lastResumeTime)
    );

    const updated = await WorkLog.findOneAndUpdate(
      {
        _id: work._id,
        ...scopeFilter(req),
        status: "RUNNING",
        lastResumeTime: work.lastResumeTime,
      },
      {
        $set: {
          status: "PAUSED",
        },
        $inc: {
          totalMinutes: minutes,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw httpError(
        "Work was already updated. Please refresh.",
        409
      );
    }

    return res.status(200).json({
      success: true,
      message: "Work paused successfully",
      work: updated,
    });
  } catch (err) {
    return handleError(res, err, "pauseWork");
  }
};

// =====================================================
// RESUME WORK
// =====================================================

export const resumeWork = async (req, res) => {
  try {
    const work = await getWork(req);

    if (work.status !== "PAUSED") {
      throw httpError(
        "Only paused work can be resumed",
        400
      );
    }

    const updated = await WorkLog.findOneAndUpdate(
      {
        _id: work._id,
        ...scopeFilter(req),
        status: "PAUSED",
      },
      {
        $set: {
          status: "RUNNING",
          lastResumeTime: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      throw httpError(
        "Work was already updated. Please refresh.",
        409
      );
    }

    return res.status(200).json({
      success: true,
      message: "Work resumed successfully",
      work: updated,
    });
  } catch (err) {
    return handleError(res, err, "resumeWork");
  }
};

// =====================================================
// STOP WORK
// =====================================================

export const stopWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const work = await getWork(req, session);

      if (work.status === "STOPPED") {
        throw httpError(
          "Work is already stopped",
          400
        );
      }

      const now = new Date();

      let totalMinutes = Number(
        work.totalMinutes || 0
      );

      if (work.status === "RUNNING") {
        totalMinutes += minutesSince(
          work.lastResumeTime
        );
      }

      totalMinutes = round2(totalMinutes);

      const totalAmount = Math.ceil(
        (totalMinutes / 60) * work.ratePerHour
      );

      work.totalMinutes = totalMinutes;
      work.totalAmount = totalAmount;
      work.endTime = now;
      work.status = "STOPPED";

      work.dueAmount = Math.max(
        0,
        round2(
          totalAmount - Number(work.paidAmount || 0)
        )
      );

      await work.save({ session });

      const advanceResult = await applyFarmerAdvance(
        work,
        session
      );

      const summary = await syncFarmerSummary(
        work.farmer,
        work.owner,
        session
      );

      result = {
        work,
        summary: {
          workAmount: totalAmount,
          advanceApplied: advanceResult.applied,
          remainingDue: advanceResult.remainingDue,
          remainingAdvance: advanceResult.remainingAdvance,
          farmerTotalDue: summary.totalDueAmount,
        },
      };
    });

    return res.status(200).json({
      success: true,
      message:
        "Work stopped successfully. Advance adjusted automatically.",
      ...result,
    });
  } catch (err) {
    return handleError(res, err, "stopWork");
  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET ALL WORKS
// =====================================================

// Pehle jaisa hi chalta hai (sab works). Naya: ?limit=&page=&status= bhejne par
// sirf utna aata hai, aur response me pagination bhi.
export const getAllWorks = async (req, res) => {
  try {
    const filter = scopeFilter(req);

    const status = String(req.query.status || "").toUpperCase();
    if (["RUNNING", "PAUSED", "STOPPED", "CANCELLED"].includes(status)) {
      filter.status = status;
    }

    const limit = parseInt(req.query.limit, 10);
    const paginated = Number.isFinite(limit) && limit > 0;
    const pageSize = paginated ? Math.min(limit, 200) : 0;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    let query = WorkLog.find(filter)
      .populate({
        path: "farmer",
        select: "name phone village",
      })
      .populate({
        path: "workRate",
        select: "type rate unit",
      })
      .sort({ createdAt: -1 })
      .lean();

    if (paginated) {
      query = query.skip((page - 1) * pageSize).limit(pageSize);
    }

    const [works, total] = await Promise.all([
      query,
      paginated ? WorkLog.countDocuments(filter) : Promise.resolve(null),
    ]);

    return res.status(200).json({
      success: true,
      count: works.length,
      works,
      ...(paginated && {
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      }),
    });
  } catch (err) {
    return handleError(res, err, "getAllWorks");
  }
};

// =====================================================
// GET ACTIVE WORKS  (GET /api/work/active)
// =====================================================

// mine   : is user ka apna RUNNING/PAUSED kaam (timer wala page isi ko dikhata hai)
// others : sirf owner ko: baaki drivers ke chalte/ruke kaam ("abhi kaun kaam par hai")
export const getActiveWorks = async (req, res) => {
  try {
    const base = {
      ...scopeFilter(req),
      status: { $in: ["RUNNING", "PAUSED"] },
    };

    const populate = [
      { path: "farmer", select: "name phone village" },
      { path: "workRate", select: "type rate unit" },
    ];

    const [mine, others] = await Promise.all([
      WorkLog.findOne({ ...base, createdBy: req.user.userId })
        .populate(populate)
        .sort({ createdAt: -1 })
        .lean(),

      req.user.role === "owner"
        ? WorkLog.find({ ...base, createdBy: { $ne: req.user.userId } })
            .populate(populate)
            .populate({ path: "createdBy", select: "name" })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
        : Promise.resolve([]),
    ]);

    return res.status(200).json({
      success: true,
      mine: mine || null,
      others,
    });
  } catch (err) {
    return handleError(res, err, "getActiveWorks");
  }
};

// =====================================================
// WORK DETAILS
// =====================================================

export const workDetails = async (req, res) => {
  try {
    const work = await WorkLog.findOne({
      _id: req.params.id,
      ...scopeFilter(req),
    })
      .populate("farmer")
      .populate("workRate");

    if (!work) {
      throw httpError("Work not found", 404);
    }

    return res.status(200).json({
      success: true,
      work,
    });
  } catch (err) {
    return handleError(res, err, "workDetails");
  }
};

// =====================================================
// UPDATE WORK
// =====================================================

export const updateWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const work = await getWork(req, session);

      if (work.status === "RUNNING") {
        throw httpError(
          "Stop the work before editing it",
          400
        );
      }

      const {
        date,
        workDate,
        workType,
        workRate,
        ratePerHour,
        totalMinutes,
        hours,
        fieldName,
      } = req.body;

      const owner = getOwner(req);

      const farmer = await Farmer.findOne({
        _id: work.farmer,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found", 404);
      }

      // -----------------------------------------
      // Restore this work's previous advance
      // allocations before recalculating amount.
      // -----------------------------------------

      const oldAdvanceApplied = round2(
        work.advanceAppliedAmount || 0
      );

      if (oldAdvanceApplied > 0) {
        await restoreWorkAdvanceAllocations({
          work,
          farmer,
          owner,
          session,
        });

        // Remove the restored advance from work's paid
        // amount. Direct payment remains untouched.
        work.paidAmount = round2(
          Number(work.paidAmount || 0) -
          oldAdvanceApplied
        );

        work.advanceAppliedAmount = 0;

        if (work.paidAmount < -0.01) {
          throw httpError(
            "Invalid work paid amount after restoring advance.",
            409
          );
        }

        work.paidAmount = Math.max(
          0,
          work.paidAmount
        );
      }

      // -----------------------------------------
      // Update date and field
      // -----------------------------------------

      if (
        date !== undefined ||
        workDate !== undefined
      ) {
        const newDate = new Date(
          date ?? workDate
        );

        if (Number.isNaN(newDate.getTime())) {
          throw httpError("Invalid work date", 400);
        }

        work.date = newDate;
      }

      if (fieldName !== undefined) {
        work.fieldName = fieldName;
      }

      if (workType !== undefined) {
        if (
          typeof workType !== "string" ||
          !workType.trim()
        ) {
          throw httpError("Invalid work type", 400);
        }

        work.workType = workType.trim();
      }

      // -----------------------------------------
      // Update work rate
      // -----------------------------------------

      if (workRate !== undefined) {
        const rateDoc = await getRate(
          workRate,
          owner,
          session
        );

        work.workRate = rateDoc._id;
        work.ratePerHour = Number(rateDoc.rate);

        if (workType === undefined) {
          work.workType = rateDoc.type;
        }
      }

      if (ratePerHour !== undefined) {
        const rate = Number(ratePerHour);

        if (!Number.isFinite(rate) || rate < 0) {
          throw httpError("Invalid hourly rate", 400);
        }

        work.ratePerHour = rate;
      }

      // -----------------------------------------
      // Update duration
      // -----------------------------------------

      let minutes = Number(
        work.totalMinutes || 0
      );

      if (totalMinutes !== undefined) {
        minutes = Number(totalMinutes);
      } else if (hours !== undefined) {
        minutes = Number(hours) * 60;
      }

      if (!Number.isFinite(minutes) || minutes < 0) {
        throw httpError(
          "Invalid work duration",
          400
        );
      }

      work.totalMinutes = round2(minutes);

      const newTotalAmount = Math.ceil(
        (work.totalMinutes / 60) *
        Number(work.ratePerHour || 0)
      );

      // At this point work.paidAmount contains only
      // direct payment amount, not previous advance.
      const directPaid = round2(
        work.paidAmount || 0
      );

      if (newTotalAmount < directPaid) {
        throw httpError(
          `New work amount cannot be less than direct payments already applied (₹${directPaid.toFixed(
            2
          )}).`,
          400
        );
      }

      work.totalAmount = newTotalAmount;

      work.dueAmount = Math.max(
        0,
        round2(newTotalAmount - directPaid)
      );

      work.paymentStatus = getPaymentStatus(
        work.dueAmount,
        directPaid
      );

      await work.save({ session });

      // -----------------------------------------
      // Reapply advance FIFO against new amount
      // -----------------------------------------

      const advanceResult = await applyFarmerAdvance(
        work,
        session
      );

      const summary = await syncFarmerSummary(
        work.farmer,
        owner,
        session
      );

      result = {
        work,
        summary: {
          oldAdvanceRestored: oldAdvanceApplied,
          newAdvanceApplied: advanceResult.applied,
          remainingAdvance: advanceResult.remainingAdvance,
          remainingDue: advanceResult.remainingDue,
          farmerTotalDue: summary.totalDueAmount,
        },
      };
    });

    return res.status(200).json({
      success: true,
      message:
        "Work updated successfully. Advance allocations recalculated.",
      ...result,
    });
  } catch (err) {
    return handleError(res, err, "updateWork");
  } finally {
    await session.endSession();
  }
};

// =====================================================
// DELETE WORK
// =====================================================

export const deleteWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const owner = getOwner(req);

    if (!isValidId(id)) {
      throw httpError("Invalid work ID", 400);
    }

    if (!owner) {
      throw httpError("Unauthorized", 401);
    }

    let deletedData;

    await session.withTransaction(async () => {
      const work = await WorkLog.findOne({
        _id: id,
        owner,
      }).session(session);

      if (!work) {
        throw httpError("Work not found", 404);
      }

      if (
        ["RUNNING", "PAUSED"].includes(work.status)
      ) {
        throw httpError(
          "Running or paused work cannot be deleted. Stop it first.",
          400
        );
      }

      const farmer = await Farmer.findOne({
        _id: work.farmer,
        owner,
      }).session(session);

      if (!farmer) {
        throw httpError("Farmer not found", 404);
      }

      // -----------------------------------------
      // Get linked payments
      // -----------------------------------------

      const payments = await Payment.find({
        owner,
        workId: work._id,
        status: "SUCCESS",
      }).session(session);

      // -----------------------------------------
      // Restore advance consumed by this work
      // -----------------------------------------

      const workAdvance = round2(
        work.advanceAppliedAmount || 0
      );

      let restoredWorkAdvance = 0;

      if (workAdvance > 0) {
        const restoreResult =
          await restoreWorkAdvanceAllocations({
            work,
            farmer,
            owner,
            session,
          });

        restoredWorkAdvance = round2(
          restoreResult.restoredAmount
        );
      }

      // -----------------------------------------
      // Reverse advance created by linked payments
      // -----------------------------------------

      let reversedPaymentAdvance = 0;

      for (const payment of payments) {
        const reversed =
          await reverseLinkedPaymentAdvance({
            payment,
            farmer,
            owner,
            session,
          });

        reversedPaymentAdvance = round2(
          reversedPaymentAdvance + reversed
        );
      }

      // -----------------------------------------
      // Delete linked payment records
      // -----------------------------------------

      const paymentResult = await Payment.deleteMany({
        owner,
        workId: work._id,
      }).session(session);

      // -----------------------------------------
      // Remove work reference from farmer
      // -----------------------------------------

      await Farmer.updateOne(
        {
          _id: farmer._id,
          owner,
        },
        {
          $pull: {
            works: work._id,
          },
        },
        { session }
      );

      // -----------------------------------------
      // Delete work
      // -----------------------------------------

      const workResult = await WorkLog.deleteOne({
        _id: work._id,
        owner,
      }).session(session);

      if (workResult.deletedCount !== 1) {
        throw httpError(
          "Work deletion failed",
          500
        );
      }

      // -----------------------------------------
      // Recalculate farmer summary
      // -----------------------------------------

      const summary = await syncFarmerSummary(
        farmer._id,
        owner,
        session
      );

      deletedData = {
        workId: work._id,
        farmerId: farmer._id,

        deletedPayments: paymentResult.deletedCount,

        restoredWorkAdvance,
        reversedPaymentAdvance,

        netAdvanceChange: round2(
          restoredWorkAdvance -
          reversedPaymentAdvance
        ),

        remainingAdvance: round2(
          farmer.advanceAmount
        ),

        summary,
      };
    });

    return res.status(200).json({
      success: true,
      message:
        "Work and linked payments deleted successfully.",
      deleted: deletedData,
    });
  } catch (error) {
    return handleError(res, error, "deleteWork");
  } finally {
    await session.endSession();
  }
};

// =====================================================
// CANCEL WORK
// =====================================================

export const cancelWork = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const work = await getWork(req, session);

      // Only running or paused work can be cancelled
      if (!["RUNNING", "PAUSED"].includes(work.status)) {
        throw httpError(
          `Cannot cancel work with ${work.status} status`,
          400
        );
      }

      const now = new Date();

      let totalMinutes = Number(work.totalMinutes || 0);

      // Preserve elapsed time if work is currently running
      if (work.status === "RUNNING") {
        totalMinutes += minutesSince(work.lastResumeTime);
      }

      totalMinutes = round2(totalMinutes);

      work.totalMinutes = totalMinutes;
      work.endTime = now;
      work.lastResumeTime = null;
      work.status = "CANCELLED";

      await work.save({ session });

      result = work;
    });

    return res.status(200).json({
      success: true,
      message: "Work cancelled successfully",
      data: result,
    });
  } catch (err) {
    return handleError(res, err, "cancelWork");
  } finally {
    await session.endSession();
  }
};