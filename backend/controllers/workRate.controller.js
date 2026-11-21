import WorkRate from "../models/workRate.model.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const MAX_RATES = 50;

const isOwnerRole = (req) => req.user?.role === "owner";

// Owner ho ya driver, rates hamesha owner ke hote hain
const ownerIdOf = (req) => req.user.ownerId;

const ownerOnly = (res) =>
  res.status(403).json({
    success: false,
    message: "Sirf owner ye kaam kar sakta hai",
  });

const cleanString = (v) => (typeof v === "string" ? v.trim() : "");

// "450" ya 450 dono chalenge, baaki sab NaN
const toRate = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
};

const isValidRate = (n) => Number.isFinite(n) && n >= 0;

/* -------------------------------------------------------------------------- */
/*                                   RATES                                    */
/* -------------------------------------------------------------------------- */

// Owner aur driver dono rates dekh sakte hain (driver ko kaam shuru karne ke liye chahiye)
export const getRates = async (req, res) => {
  try {
    const rates = await WorkRate.find({ owner: ownerIdOf(req) }).sort({ type: 1 });
    res.status(200).json({ success: true, rates });
  } catch (err) {
    console.error("getRates failed:", err);
    res.status(500).json({ success: false, message: "Failed to load work rates" });
  }
};

// type body ya query, dono se le leta hai (route GET ho ya POST)
export const getRateByType = async (req, res) => {
  try {
    const type = cleanString(req.query?.type ?? req.body?.type);

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Work type is required",
      });
    }

    const workRate = await WorkRate.findOne({ owner: ownerIdOf(req), type });

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
    console.error("getRateByType failed:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const addRates = async (req, res) => {
  try {
    if (!isOwnerRole(req)) return ownerOnly(res);

    const type = cleanString(req.body.type);
    const rate = toRate(req.body.rate);
    const unit = cleanString(req.body.unit).slice(0, 20) || "hour";

    if (!type || !isValidRate(rate)) {
      return res.status(400).json({
        success: false,
        message: "Valid type aur rate (0 ya usse zyada) zaroori hai",
      });
    }

    const owner = ownerIdOf(req);

    const exists = await WorkRate.findOne({ owner, type });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Rate already exists for this work type.",
      });
    }

    const workRate = await WorkRate.create({ owner, type, rate, unit });

    res.status(201).json({
      success: true,
      message: "Work rate added successfully.",
      workRate,
    });
  } catch (error) {
    // unique index (owner + type) ho to race condition yahin pakdi jaati hai
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Rate already exists for this work type.",
      });
    }
    console.error("addRates failed:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// body: { rates: [{ type: "Ploughing", rate: 450, unit: "hour" }, ...] }
export const updateRates = async (req, res) => {
  try {
    if (!isOwnerRole(req)) return ownerOnly(res);

    const ownerId = ownerIdOf(req);
    const { rates } = req.body;

    if (!Array.isArray(rates) || rates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "rates must be a non-empty array" });
    }
    if (rates.length > MAX_RATES) {
      return res
        .status(400)
        .json({ success: false, message: `Ek baar me maximum ${MAX_RATES} rates` });
    }

    const cleaned = [];
    const seen = new Set();

    for (const r of rates) {
      const type = cleanString(r?.type); // string check, taaki filter me object (injection) na jaye
      const rate = toRate(r?.rate);

      if (!type || !isValidRate(rate)) {
        return res.status(400).json({
          success: false,
          message: `Invalid rate entry for "${type || "unknown"}"`,
        });
      }
      if (seen.has(type)) {
        return res.status(400).json({
          success: false,
          message: `"${type}" do baar aaya hai`,
        });
      }
      seen.add(type);

      cleaned.push({
        type,
        rate,
        unit: cleanString(r.unit).slice(0, 20) || "hour",
      });
    }

    await WorkRate.bulkWrite(
      cleaned.map((r) => ({
        updateOne: {
          filter: { owner: ownerId, type: r.type },
          update: { $set: { rate: r.rate, unit: r.unit } },
          upsert: true,
        },
      }))
    );

    const updated = await WorkRate.find({ owner: ownerId }).sort({ type: 1 });
    res.status(200).json({ success: true, rates: updated });
  } catch (err) {
    console.error("updateRates failed:", err);
    res.status(500).json({ success: false, message: "Failed to save work rates" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                  PROFILE                                   */
/* -------------------------------------------------------------------------- */

// Owner ko poori profile, driver ko sirf tractor/currency (owner ka email/phone nahi)
export const getProfile = async (req, res) => {
  try {
    const fields = isOwnerRole(req)
      ? "name phone email tractorModel tractorNumber currency"
      : "tractorModel tractorNumber currency";

    const profile = await User.findById(ownerIdOf(req)).select(fields).lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }
    res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error("getProfile failed:", err);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
};

// body: { name, phone, tractorModel, tractorNumber, currency }
export const updateProfile = async (req, res) => {
  try {
    if (!isOwnerRole(req)) return ownerOnly(res);

    const fields = ["name", "phone", "tractorModel", "tractorNumber", "currency"];
    const update = {};

    for (const key of fields) {
      const value = req.body[key];
      if (value === undefined) continue;

      if (typeof value !== "string") {
        return res
          .status(400)
          .json({ success: false, message: `${key} text hona chahiye` });
      }
      update[key] = value.trim().slice(0, 100);
    }

    if (update.name !== undefined && !update.name) {
      return res
        .status(400)
        .json({ success: false, message: "Naam khali nahi ho sakta" });
    }
    if (update.currency !== undefined) {
      update.currency = update.currency.toUpperCase();
      if (!/^[A-Z]{3}$/.test(update.currency)) {
        return res
          .status(400)
          .json({ success: false, message: "Currency 3 letter ka code ho (jaise INR)" });
      }
    }
    if (update.tractorNumber !== undefined) {
      update.tractorNumber = update.tractorNumber.toUpperCase();
    }

    if (Object.keys(update).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Update karne ke liye koi field nahi mili" });
    }

    const profile = await User.findByIdAndUpdate(
      ownerIdOf(req),
      { $set: update },
      { new: true, runValidators: true }
    )
      .select("name phone email tractorModel tractorNumber currency")
      .lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }
    res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error("updateProfile failed:", err);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
};

/* -------------------------------------------------------------------------- */
/*                               DELETE A RATE                                */
/* -------------------------------------------------------------------------- */

// DELETE /:id  (sirf owner). Purane kaam ke records me rate/workType ki copy
// pehle se saved hai, isliye unka hisaab nahi bigadta.
export const deleteRate = async (req, res) => {
  try {
    if (!isOwnerRole(req)) return ownerOnly(res);

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid rate id" });
    }

    const deleted = await WorkRate.findOneAndDelete({ _id: id, owner: ownerIdOf(req) });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Rate not found" });
    }

    res.status(200).json({ success: true, message: "Work type delete ho gaya" });
  } catch (err) {
    console.error("deleteRate failed:", err);
    res.status(500).json({ success: false, message: "Failed to delete rate" });
  }
};