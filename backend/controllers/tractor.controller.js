import User from "../models/user.model.js";
import WorkLog from "../models/work.model.js";

const round = (n) => Math.round(n);

// GET /api/tractor/status
// Owner ka tractor ka model + abhi kya chal raha hai (owner aur driver dono ke liye)
export const tractorStatus = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;

    const [owner, activeWorks, lastStopped] = await Promise.all([
      User.findById(ownerId).select("tractorModel tractorNumber").lean(),
      WorkLog.find({ owner: ownerId, status: { $in: ["RUNNING", "PAUSED"] } })
        .sort({ updatedAt: -1 })
        .populate("farmer", "name")
        .select("status workType fieldName farmer totalMinutes lastResumeTime startTime")
        .lean(),
      WorkLog.findOne({ owner: ownerId, status: "STOPPED" })
        .sort({ endTime: -1 })
        .select("endTime")
        .lean(),
    ]);

    const running = activeWorks.filter((w) => w.status === "RUNNING");
    const paused = activeWorks.filter((w) => w.status === "PAUSED");

    const status = running.length ? "RUNNING" : paused.length ? "PAUSED" : "IDLE";
    const current = running[0] || paused[0] || null;

    let currentWork = null;
    if (current) {
      // RUNNING me ab tak ka time = jama hua time + last resume ke baad ka time
      const extra =
        current.status === "RUNNING" && current.lastResumeTime
          ? (Date.now() - new Date(current.lastResumeTime).getTime()) / 60000
          : 0;

      currentWork = {
        workType: current.workType,
        fieldName: current.fieldName || "",
        farmerName: current.farmer?.name || "",
        workedMinutes: round((current.totalMinutes || 0) + extra),
      };
    }

    return res.status(200).json({
      success: true,
      tractor: {
        model: owner?.tractorModel || "",
        number: owner?.tractorNumber || "",
      },
      status,
      runningCount: running.length,
      pausedCount: paused.length,
      current: currentWork,
      lastWorkAt: lastStopped?.endTime || null,
    });
  } catch (err) {
    console.error("tractorStatus error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/tractor/details  (sirf owner)
// body: { model: "Mahindra 575 DI", number: "WB 12 AB 3456" }
export const updateTractor = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Sirf owner tractor ki detail badal sakta hai",
      });
    }

    const model =
      typeof req.body.model === "string" ? req.body.model.trim().slice(0, 80) : "";
    const number =
      typeof req.body.number === "string"
        ? req.body.number.trim().toUpperCase().slice(0, 20)
        : "";

    if (!model) {
      return res
        .status(400)
        .json({ success: false, message: "Tractor ka model daalo" });
    }
    if (number && !/^[A-Z0-9 -]{4,20}$/.test(number)) {
      return res.status(400).json({
        success: false,
        message: "Number sahi format me daalo (jaise WB 12 AB 3456)",
      });
    }

    const owner = await User.findByIdAndUpdate(
      req.user.ownerId,
      { $set: { tractorModel: model, tractorNumber: number } },
      { new: true }
    )
      .select("tractorModel tractorNumber")
      .lean();

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }

    // Schema me field na ho to Mongoose chupchap save nahi karta, isliye yahin pakad lo
    if (owner.tractorModel !== model) {
      return res.status(500).json({
        success: false,
        message: "Save nahi hua: user.model.js me tractorModel aur tractorNumber field jodo",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tractor ki detail save ho gayi",
      tractor: { model: owner.tractorModel, number: owner.tractorNumber || "" },
    });
  } catch (err) {
    console.error("updateTractor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};