import mongoose from "mongoose";
import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import WorkRate from "../models/workRate.model.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Owner sab dekhta hai, driver sirf apna banaya hua
export const scopeFilter = (req) => {
  const filter = { owner: req.user.ownerId };
  if (req.user.role !== "owner") filter.createdBy = req.user.userId;
  return filter;
};

const httpError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const handleError = (res, err, label) => {
  if (!err.statusCode) console.error(`${label} error:`, err);
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.statusCode ? err.message : "Server error",
  });
};

const round2 = (n) => Math.round(n * 100) / 100;
const minutesSince = (date) => (Date.now() - date.getTime()) / 60000;

const getPaymentStatus = (dueAmount, paidAmount) => {
  if (dueAmount < 0) return "advanced";
  if (dueAmount === 0) return "paid";
  if (paidAmount > 0) return "partial";
  return "due";
};

// Rate sirf isi owner ka valid hai
const getRate = async (workRateId, owner) => {
  if (!isValidId(workRateId)) throw httpError("Invalid work rate id", 400);
  const rate = await WorkRate.findOne({ _id: workRateId, owner });
  if (!rate) throw httpError("Work rate not found", 404);
  return rate;
};

// Farmer is user ke scope me hona chahiye
const getFarmer = async (req, farmerId) => {
  if (!isValidId(farmerId)) throw httpError("Invalid farmer id", 400);
  const farmer = await Farmer.findOne({ _id: farmerId, ...scopeFilter(req) }).select("_id");
  if (!farmer) throw httpError("Farmer not found", 404);
  return farmer;
};

const getWork = async (req) => {
  if (!isValidId(req.params.id)) throw httpError("Invalid work id", 400);
  const work = await WorkLog.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!work) throw httpError("Work not found", 404);
  return work;
};

/* ------------------------------ START WORK ------------------------------ */
export const startWork = async (req, res) => {
  try {
    const {
      hourlyRate,
      description,
      workDate,
      mode,
      farmerId,
      fieldName,
      workRate,
    } = req.body;

    // Validation
    if (!hourlyRate && !workRate) {
      throw httpError("Hourly rate is required", 400);
    }

    let ratePerHour = Number(hourlyRate);
    let rateDoc = null;

    // If frontend sends workRate ID, fetch rate from database
    if (workRate) {
      rateDoc = await getRate(workRate, req.user.ownerId);
      ratePerHour = rateDoc.rate;
    }

    // Farmer is optional for generic timer
    let farmer = null;

    if (farmerId) {
      farmer = await getFarmer(req, farmerId);
    }

    const now = new Date();

    const work = await WorkLog.create({
      createdBy: req.user.userId,
      owner: req.user.ownerId,

      farmer: farmer?._id || undefined,

      fieldName: fieldName || description || "General Work",

      workType: rateDoc?.type || "General",

      workRate: rateDoc?._id || undefined,

      ratePerHour,

      status: "RUNNING",

      startTime: now,
      lastResumeTime: now,

      totalMinutes: 0,

      paidAmount: 0,
      totalAmount: 0,
      dueAmount: 0,

      paymentStatus: "due",

      date: workDate || now,

      mode: mode || "timer",
    });

    // Add work to farmer only if farmer exists
    if (farmer) {
      await Farmer.updateOne(
        { _id: farmer._id },
        {
          $addToSet: {
            works: work._id,
          },
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Work started successfully",
      work,
    });

  } catch (err) {
    handleError(res, err, "startWork");
  }
};

/* ------------------------------- ADD WORK ------------------------------- */
export const addWork = async (req, res) => {
  try {
    const { farmerId, fieldName, workRate, totalMinutes, paidAmount = 0, startTime, date } = req.body;

    if (!farmerId || !workRate) {
      throw httpError("Farmer and Work Rate are required", 400);
    }

    const minutes = Number(totalMinutes);
    const paid = Number(paidAmount);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw httpError("totalMinutes must be a positive number", 400);
    }
    if (!Number.isFinite(paid) || paid < 0) {
      throw httpError("paidAmount must be 0 or more", 400);
    }

    const farmer = await getFarmer(req, farmerId);
    const rateDoc = await getRate(workRate, req.user.ownerId);

    const totalAmount = Math.ceil((minutes / 60) * rateDoc.rate);
    const dueAmount = totalAmount - paid;
    const endTime = new Date();

    const work = await WorkLog.create({
      createdBy: req.user.userId,
      owner: req.user.ownerId,
      farmer: farmer._id,
      fieldName,
      workType: rateDoc.type,
      workRate: rateDoc._id,
      ratePerHour: rateDoc.rate,
      startTime: startTime ? new Date(startTime) : new Date(endTime.getTime() - minutes * 60000),
      endTime,
      totalMinutes: minutes,
      totalAmount,
      paidAmount: paid,
      dueAmount,
      paymentStatus: getPaymentStatus(dueAmount, paid),
      status: "STOPPED",
      date: date || endTime,
    });

    await Farmer.updateOne(
      { _id: farmer._id },
      {
        $inc: {
          totalWorkMinutes: minutes,
          totalBilledAmount: totalAmount,
          totalPaidAmount: paid,
          totalDueAmount: dueAmount,
        },
        $set: { lastWorkDate: endTime },
        $addToSet: { works: work._id },
      }
    );

    res.status(201).json({ success: true, message: "Work added successfully", work });
  } catch (err) {
    handleError(res, err, "addWork");
  }
};

/* ------------------------------- PAUSE WORK ------------------------------ */
export const pauseWork = async (req, res) => {
  try {
    const work = await getWork(req);

    if (work.status !== "RUNNING") {
      throw httpError("Only running work can be paused", 400);
    }

    // Seconds ka precision bacha ke rakho (floor nahi)
    const minutes = round2(minutesSince(work.lastResumeTime));

    // Atomic: sirf tab update jab status/lastResumeTime abhi bhi wahi ho
    const updated = await WorkLog.findOneAndUpdate(
      { _id: work._id, status: "RUNNING", lastResumeTime: work.lastResumeTime },
      { $set: { status: "PAUSED" }, $inc: { totalMinutes: minutes } },
      { new: true }
    );
    if (!updated) throw httpError("Work was already updated, please refresh", 409);

    res.status(200).json({ success: true, message: "Work paused successfully", work: updated });
  } catch (err) {
    handleError(res, err, "pauseWork");
  }
};

/* ------------------------------ RESUME WORK ------------------------------ */
export const resumeWork = async (req, res) => {
  try {
    const work = await getWork(req);

    if (work.status !== "PAUSED") {
      throw httpError("Only paused work can be resumed", 400);
    }

    const updated = await WorkLog.findOneAndUpdate(
      { _id: work._id, status: "PAUSED" },
      { $set: { status: "RUNNING", lastResumeTime: new Date() } },
      { new: true }
    );
    if (!updated) throw httpError("Work was already updated, please refresh", 409);

    res.status(200).json({ success: true, message: "Work resumed successfully", work: updated });
  } catch (err) {
    handleError(res, err, "resumeWork");
  }
};

/* ------------------------------- STOP WORK ------------------------------- */
export const stopWork = async (req, res) => {
  try {
    const work = await getWork(req);

    if (work.status === "STOPPED") {
      throw httpError("Work already stopped", 400);
    }

    const now = new Date();
    let totalMinutes = work.totalMinutes;
    const condition = { _id: work._id, status: work.status };

    if (work.status === "RUNNING") {
      totalMinutes += minutesSince(work.lastResumeTime);
      condition.lastResumeTime = work.lastResumeTime;
    }

    totalMinutes = round2(totalMinutes);
    const totalAmount = Math.ceil((totalMinutes / 60) * work.ratePerHour);
    const dueAmount = totalAmount - work.paidAmount;

    // Atomic: double-tap pe sirf ek request jeetegi, farmer totals do baar nahi badhenge
    const updated = await WorkLog.findOneAndUpdate(
      condition,
      {
        $set: {
          endTime: now,
          totalMinutes,
          totalAmount,
          dueAmount,
          paymentStatus: getPaymentStatus(dueAmount, work.paidAmount),
          status: "STOPPED",
        },
      },
      { new: true }
    );
    if (!updated) throw httpError("Work was already updated, please refresh", 409);

    await Farmer.updateOne(
      { _id: updated.farmer },
      {
        $inc: {
          totalWorkMinutes: totalMinutes,
          totalBilledAmount: totalAmount,
          totalPaidAmount: updated.paidAmount,
          totalDueAmount: dueAmount,
        },
        $set: { lastWorkDate: now },
        $addToSet: { works: updated._id },
      }
    );

    res.status(200).json({ success: true, message: "Work stopped successfully", work: updated });
  } catch (err) {
    handleError(res, err, "stopWork");
  }
};

/* ------------------------------ GET ALL WORKS ---------------------------- */
export const getAllWorks = async (req, res) => {
  try {
    const works = await WorkLog.find(scopeFilter(req))
      .populate({ path: "farmer", select: "name phone village" })
      .populate({ path: "workRate", select: "type rate unit" })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: works.length, works });
  } catch (err) {
    handleError(res, err, "getAllWorks");
  }
};

/* ------------------------------ WORK DETAILS ----------------------------- */
export const workDetails = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) throw httpError("Invalid work id", 400);

    const work = await WorkLog.findOne({ _id: req.params.id, ...scopeFilter(req) })
      .populate("farmer")
      .populate("workRate");

    if (!work) throw httpError("Work not found", 404);

    res.status(200).json({ success: true, work });
  } catch (err) {
    handleError(res, err, "workDetails");
  }
};