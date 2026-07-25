import farmerModel from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import WorkRate from "../models/workRate.model.js";

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

const getPaymentStatus = (dueAmount) => {
  if (dueAmount === 0) return "paid";
  if (dueAmount < 0) return "advanced";
  return "due";
};

const getRate = async (workRateId) => {
  const rate = await WorkRate.findById(workRateId);

  if (!rate) {
    throw new Error("Work rate not found");
  }

  return rate;
};

/* -------------------------------------------------------------------------- */
/*                                 START WORK                                 */
/* -------------------------------------------------------------------------- */

export const startWork = async (req, res) => {
  try {
    const {
      farmerId,
      fieldName,
      workType,
      workRate,
      date,
    } = req.body;

    if (!farmerId || !workRate) {
      return res.status(400).json({
        success: false,
        message: "Farmer and Work Rate are required",
      });
    }

    const rateDoc = await getRate(workRate);

    const work = await WorkLog.create({
      createdBy: req.user.userId,
      owner: req.user.ownerId,

      farmer: farmerId,

      fieldName,

      workType,

      workRate: rateDoc._id,

      ratePerHour: rateDoc.rate,

      status: "RUNNING",

      startTime: new Date(),

      lastResumeTime: new Date(),

      totalMinutes: 0,

      paidAmount: 0,

      totalAmount: 0,

      dueAmount: 0,

      paymentStatus: "due",

      date,
    });

    res.status(201).json({
      success: true,
      message: "Work started successfully",
      work,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                  ADD WORK                                  */
/* -------------------------------------------------------------------------- */

export const addWork = async (req, res) => {
  try {
    const {
      farmerId,
      fieldName,
      workType,
      workRate,
      totalMinutes,
      paidAmount = 0,
      startTime,
      date,
    } = req.body;

    if (!farmerId || !workRate) {
      return res.status(400).json({
        success: false,
        message: "Farmer and Work Rate are required",
      });
    }

    const rateDoc = await getRate(workRate);

    const totalAmount = Math.ceil(
      (totalMinutes / 60) * rateDoc.rate
    );

    const dueAmount = totalAmount - paidAmount;

    const paymentStatus = getPaymentStatus(dueAmount);

    const work = await WorkLog.create({
      createdBy: req.user.userId,

      owner: req.user.ownerId,

      farmer: farmerId,

      fieldName,

      workType,

      workRate: rateDoc._id,

      ratePerHour: rateDoc.rate,

      startTime,

      endTime: new Date(),

      totalMinutes,

      totalAmount,

      paidAmount,

      dueAmount,

      paymentStatus,

      status: "STOPPED",

      date,
    });

    await farmerModel.findByIdAndUpdate(
      farmerId,
      {
        $inc: {
          totalWorkMinutes: totalMinutes,
          totalBilledAmount: totalAmount,
          totalPaidAmount: paidAmount,
          totalDueAmount: dueAmount,
        },

        $push: {
          works: work._id,
        },
      },
      {
        new: true,
      }
    );

    res.status(201).json({
      success: true,
      message: "Work added successfully",
      work,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                PAUSE WORK                                  */
/* -------------------------------------------------------------------------- */

export const pauseWork = async (req, res) => {
  try {
    const work = await WorkLog.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    if (work.status !== "RUNNING") {
      return res.status(400).json({
        success: false,
        message: "Only running work can be paused",
      });
    }

    const minutes = Math.floor(
      (Date.now() - work.lastResumeTime.getTime()) / (1000 * 60)
    );

    work.totalMinutes += minutes;
    work.status = "PAUSED";

    await work.save();

    res.status(200).json({
      success: true,
      message: "Work paused successfully",
      work,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                               RESUME WORK                                  */
/* -------------------------------------------------------------------------- */

export const resumeWork = async (req, res) => {
  try {
    const work = await WorkLog.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    if (work.status !== "PAUSED") {
      return res.status(400).json({
        success: false,
        message: "Only paused work can be resumed",
      });
    }

    work.status = "RUNNING";
    work.lastResumeTime = new Date();

    await work.save();

    res.status(200).json({
      success: true,
      message: "Work resumed successfully",
      work,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                 STOP WORK                                  */
/* -------------------------------------------------------------------------- */

export const stopWork = async (req, res) => {
  try {
    const work = await WorkLog.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    if (work.status === "STOPPED") {
      return res.status(400).json({
        success: false,
        message: "Work already stopped",
      });
    }

    const now = new Date();

    // If currently running then calculate remaining minutes
    if (work.status === "RUNNING") {
      const minutes = Math.floor(
        (now.getTime() - work.lastResumeTime.getTime()) / (1000 * 60)
      );

      work.totalMinutes += minutes;
    }

    work.endTime = now;

    work.totalAmount = Math.ceil(
      (work.totalMinutes / 60) * work.ratePerHour
    );

    work.dueAmount =
      work.totalAmount - work.paidAmount;

    work.paymentStatus = getPaymentStatus(work.dueAmount);

    work.status = "STOPPED";

    await work.save();

    await farmerModel.findByIdAndUpdate(
      work.farmer,
      {
        $inc: {
          totalWorkMinutes: work.totalMinutes,
          totalBilledAmount: work.totalAmount,
          totalPaidAmount: work.paidAmount,
          totalDueAmount: work.dueAmount,
        },
        $addToSet: {
          works: work._id,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Work stopped successfully",
      work,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                               GET ALL WORKS                                */
/* -------------------------------------------------------------------------- */

export const getAllWorks = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "owner") {
      filter.owner = req.user.ownerId;
    } else {
      filter.createdBy = req.user.userId;
    }

    const works = await WorkLog.find(filter)
      .populate({
        path: "farmer",
        select: "name phone village",
      })
      .populate({
        path: "workRate",
        select: "type rate unit",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: works.length,
      works,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


/* -------------------------------------------------------------------------- */
/*                               WORK DETAILS                                 */
/* -------------------------------------------------------------------------- */

export const workDetails = async (req, res) => {
  try {

    const work = await WorkLog.findById(req.params.id)
      .populate("farmer")
      .populate("workRate");

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    res.status(200).json({
      success: true,
      work,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};