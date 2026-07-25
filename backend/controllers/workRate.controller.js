import WorkRate from "../models/workRate.model.js";
import Owner from "../models/user.model.js";

// GET /api/settings/rates
export const getRates = async (req, res) => {
  try {
    const ownerId = req.owner?._id || req.user?.userId;
    const rates = await WorkRate.find({ owner: ownerId }).sort({ type: 1 });
    res.status(200).json({ rates });
  } catch (err) {
    console.error("getRates failed:", err);
    res.status(500).json({ message: "Failed to load work rates" });
  }
};


export const getRateByType = async (req, res) => {
  try {
    const owner = req.user.userId;
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Work type is required",
      });
    }

    const workRate = await WorkRate.findOne({ owner, type });

    if (!workRate) {
      return res.status(404).json({
        success: false,
        message: "Rate not found for this work type",
      });
    }

    res.status(200).json({
      success: true,
      rate: workRate.rate,
      unit: workRate.unit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const addRates = async (req, res) => {
  try {
    const owner = req.user.userId;
    const { type, rate, unit } = req.body;

    if (!type || rate == null) {
      return res.status(400).json({
        success: false,
        message: "Type and rate are required.",
      });
    }

    // Check if rate already exists for this owner and work type
    const exists = await WorkRate.findOne({ owner, type });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Rate already exists for this work type.",
      });
    }

    const workRate = await WorkRate.create({
      owner,
      type,
      rate,
      unit,
    });

    res.status(201).json({
      success: true,
      message: "Work rate added successfully.",
      workRate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// PUT /api/settings/rates
// body: { rates: [{ type: "Ploughing", rate: 450 }, ...] }
export const updateRates = async (req, res) => {
  try {
    const ownerId = req.owner?._id || req.user?.userId;
    const { rates } = req.body;

    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ message: "rates must be a non-empty array" });
    }

    for (const r of rates) {
      if (!r.type || typeof r.rate !== "number" || Number.isNaN(r.rate) || r.rate < 0) {
        return res.status(400).json({
          message: `Invalid rate entry for "${r.type ?? "unknown"}"`,
        });
      }
    }

    const operations = rates.map((r) => ({
      updateOne: {
        filter: { owner: ownerId, type: r.type },
        update: { $set: { rate: r.rate, unit: r.unit || "hour" } },
        upsert: true,
      },
    }));

    await WorkRate.bulkWrite(operations);

    const updated = await WorkRate.find({ owner: ownerId }).sort({ type: 1 });
    res.status(200).json({ rates: updated });
  } catch (err) {
    console.error("updateRates failed:", err);
    res.status(500).json({ message: "Failed to save work rates" });
  }
};

// GET /api/settings/profile
export const getProfile = async (req, res) => {
  try {
    const ownerId = req.owner?._id || req.user?.userId;
    const owner = await Owner.findById(ownerId).select(
      "name phone tractorModel currency email"
    );
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.status(200).json({ profile: owner });
  } catch (err) {
    console.error("getProfile failed:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

// PATCH /api/settings/profile
// body: { name, phone, tractorModel, currency }
export const updateProfile = async (req, res) => {
  try {
    const ownerId = req.owner?._id || req.user?._id;
    const { name, phone, tractorModel, currency } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (tractorModel !== undefined) update.tractorModel = tractorModel;
    if (currency !== undefined) update.currency = currency;

    const owner = await Owner.findByIdAndUpdate(ownerId, update, {
      new: true,
      runValidators: true,
    }).select("name phone tractorModel currency email");

    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.status(200).json({ profile: owner });
  } catch (err) {
    console.error("updateProfile failed:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
};