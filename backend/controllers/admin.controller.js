import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/user.model.js";
import Farmer from "../models/farmer.model.js";
import WorkLog from "../models/work.model.js";
import Payment from "../models/payment.model.js";
import Expense from "../models/expenses.model.js";
import WorkRate from "../models/workRate.model.js";
import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";
import FarmerAdvanceLedger from "../models/farmerAdvanceLedger.model.js";
import FarmerAdvanceAllocation from "../models/farmerAdvanceAllocation.model.js";
import AdminAudit from "../models/admin.model.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

// Sirf role "owner" wale user par admin action chalega
const findOwnerOr404 = async (id, res) => {
  if (!isValidId(id)) {
    fail(res, 400, "Invalid owner ID.");
    return null;
  }

  const owner = await User.findOne({ _id: id, role: "owner" });

  if (!owner) {
    fail(res, 404, "Owner not found.");
    return null;
  }

  return owner;
};

const audit = async (req, action, owner, details = null) => {
  try {
    const admin = await User.findById(req.user.userId).select("name").lean();

    await AdminAudit.create({
      admin: req.user.userId,
      adminName: admin?.name || "",
      action,
      targetOwner: owner._id,
      targetName: owner.name,
      targetEmail: owner.email,
      details,
    });
  } catch (error) {
    // Audit fail hone se asli kaam na rukey
    console.error("Admin audit error:", error);
  }
};

// Ek saath kai owners ke counts aur hisaab (N+1 queries se bachne ke liye)
const buildOwnerStats = async (ownerIds) => {
  const ids = ownerIds.map(toObjectId);

  const [driverCounts, farmerCounts, workStats, lastWork] = await Promise.all([
    User.aggregate([
      { $match: { role: "driver", owner: { $in: ids } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]),
    Farmer.aggregate([
      { $match: { owner: { $in: ids } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]),
    WorkLog.aggregate([
      { $match: { owner: { $in: ids }, status: { $ne: "CANCELLED" } } },
      {
        $group: {
          _id: "$owner",
          works: { $sum: 1 },
          billed: { $sum: { $ifNull: ["$totalAmount", 0] } },
          paid: { $sum: { $ifNull: ["$paidAmount", 0] } },
          due: { $sum: { $ifNull: ["$dueAmount", 0] } },
        },
      },
    ]),
    WorkLog.aggregate([
      { $match: { owner: { $in: ids } } },
      { $group: { _id: "$owner", lastActivity: { $max: "$createdAt" } } },
    ]),
  ]);

  const byId = (rows) => new Map(rows.map((r) => [String(r._id), r]));
  const drivers = byId(driverCounts);
  const farmers = byId(farmerCounts);
  const works = byId(workStats);
  const last = byId(lastWork);

  return (ownerId) => {
    const key = String(ownerId);
    const w = works.get(key);

    return {
      drivers: drivers.get(key)?.count || 0,
      farmers: farmers.get(key)?.count || 0,
      works: w?.works || 0,
      billed: round2(w?.billed || 0),
      paid: round2(w?.paid || 0),
      due: round2(w?.due || 0),
      lastActivity: last.get(key)?.lastActivity || null,
    };
  };
};

/* ------------------------------------------------------------------ */
/* GET /api/admin/stats  (poore platform ka summary)                    */
/* ------------------------------------------------------------------ */

export const getPlatformStats = async (req, res) => {
  try {
    const [ownerAgg, driverCount, farmerCount, workAgg, paymentCount] =
      await Promise.all([
        User.aggregate([
          { $match: { role: "owner" } },
          { $group: { _id: "$isActive", count: { $sum: 1 } } },
        ]),
        User.countDocuments({ role: "driver" }),
        Farmer.countDocuments({}),
        WorkLog.aggregate([
          { $match: { status: { $ne: "CANCELLED" } } },
          {
            $group: {
              _id: null,
              works: { $sum: 1 },
              billed: { $sum: { $ifNull: ["$totalAmount", 0] } },
              paid: { $sum: { $ifNull: ["$paidAmount", 0] } },
              due: { $sum: { $ifNull: ["$dueAmount", 0] } },
            },
          },
        ]),
        Payment.countDocuments({}),
      ]);

    const active = ownerAgg.find((r) => r._id !== false)?.count || 0;
    const disabled = ownerAgg.find((r) => r._id === false)?.count || 0;
    const w = workAgg[0] || {};

    return res.status(200).json({
      success: true,
      stats: {
        owners: { total: active + disabled, active, disabled },
        drivers: driverCount,
        farmers: farmerCount,
        works: w.works || 0,
        payments: paymentCount,
        billed: round2(w.billed || 0),
        paid: round2(w.paid || 0),
        due: round2(w.due || 0),
      },
    });
  } catch (error) {
    console.error("getPlatformStats error:", error);
    return fail(res, 500, "Failed to load platform stats.");
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/admin/owners?search=&status=&page=&limit=&sort=             */
/* ------------------------------------------------------------------ */

export const listOwners = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 50, 10);
    const status = String(req.query.status || "all");
    const search = String(req.query.search || "").trim().slice(0, 80);

    const filter = { role: "owner" };

    if (status === "active") filter.isActive = { $ne: false };
    if (status === "disabled") filter.isActive = false;

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { village: rx }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;

    const [owners, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const statsFor = await buildOwnerStats(owners.map((o) => o._id));

    return res.status(200).json({
      success: true,
      owners: owners.map((o) => ({
        ...o,
        isActive: o.isActive !== false,
        stats: statsFor(o._id),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("listOwners error:", error);
    return fail(res, 500, "Failed to load owners.");
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/admin/owners/:id  (ek owner ki poori detail)                */
/* ------------------------------------------------------------------ */

export const getOwnerDetails = async (req, res) => {
  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    const statsFor = await buildOwnerStats([owner._id]);

    const [drivers, recentWorks] = await Promise.all([
      User.find({ role: "driver", owner: owner._id })
        .select("name email phone isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      WorkLog.find({ owner: owner._id })
        .populate("farmer", "name")
        .sort({ createdAt: -1 })
        .limit(8)
        .select("date farmer workType status totalAmount paidAmount dueAmount")
        .lean(),
    ]);

    const { password, ...safeOwner } = owner.toObject();

    return res.status(200).json({
      success: true,
      owner: { ...safeOwner, isActive: owner.isActive !== false },
      stats: statsFor(owner._id),
      drivers,
      recentWorks,
    });
  } catch (error) {
    console.error("getOwnerDetails error:", error);
    return fail(res, 500, "Failed to load owner details.");
  }
};

/* ------------------------------------------------------------------ */
/* PATCH /api/admin/owners/:id  (name, email, phone, village)           */
/* ------------------------------------------------------------------ */

export const updateOwner = async (req, res) => {
  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    const body = req.body || {};
    const changes = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 80) {
        return fail(res, 400, "Name is required (max 80 characters).");
      }
      if (name !== owner.name) changes.name = name;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return fail(res, 400, "Invalid email.");
      }
      if (email !== owner.email) {
        const taken = await User.exists({ email, _id: { $ne: owner._id } });
        if (taken) return fail(res, 409, "This email is already in use.");
        changes.email = email;
      }
    }

    for (const field of ["phone", "village"]) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim().slice(0, 80);
        if (value !== (owner[field] || "")) changes[field] = value;
      }
    }

    if (!Object.keys(changes).length) {
      return fail(res, 400, "Nothing to update.");
    }

    const before = {};
    Object.keys(changes).forEach((k) => {
      before[k] = owner[k] ?? "";
    });

    Object.assign(owner, changes);
    await owner.save();

    await audit(req, "UPDATE", owner, { before, after: changes });

    return res.status(200).json({
      success: true,
      message: "Owner updated.",
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        village: owner.village,
        isActive: owner.isActive !== false,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, "This email is already in use.");
    }
    console.error("updateOwner error:", error);
    return fail(res, 500, "Failed to update owner.");
  }
};

/* ------------------------------------------------------------------ */
/* PATCH /api/admin/owners/:id/status  { isActive: true|false }         */
/* Disable karne par owner aur uske drivers login/use nahi kar paate     */
/* (protect middleware isActive check karta hai).                       */
/* ------------------------------------------------------------------ */

export const setOwnerStatus = async (req, res) => {
  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    if (typeof req.body?.isActive !== "boolean") {
      return fail(res, 400, "isActive (true/false) is required.");
    }

    const next = req.body.isActive;

    if ((owner.isActive !== false) === next) {
      return fail(
        res,
        400,
        next ? "Owner is already active." : "Owner is already disabled."
      );
    }

    owner.isActive = next;
    await owner.save();

    await audit(req, next ? "ENABLE" : "DISABLE", owner);

    return res.status(200).json({
      success: true,
      message: next ? "Owner enabled." : "Owner disabled.",
      isActive: next,
    });
  } catch (error) {
    console.error("setOwnerStatus error:", error);
    return fail(res, 500, "Failed to change owner status.");
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/admin/owners/:id/reset-password  { newPassword }           */
/* ------------------------------------------------------------------ */

export const resetOwnerPassword = async (req, res) => {
  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (newPassword.length < 8 || newPassword.length > 72) {
      return fail(res, 400, "Password must be 8-72 characters.");
    }

    owner.password = await bcrypt.hash(newPassword, 10);
    await owner.save();

    // Password audit me kabhi save nahi karte
    await audit(req, "RESET_PASSWORD", owner);

    return res.status(200).json({
      success: true,
      message: "Password reset. Share the new password with the owner securely.",
    });
  } catch (error) {
    console.error("resetOwnerPassword error:", error);
    return fail(res, 500, "Failed to reset password.");
  }
};

/* ------------------------------------------------------------------ */
/* DELETE /api/admin/owners/:id  { confirmEmail }                       */
/* PERMANENT: owner, uske drivers aur poora data hamesha ke liye hat    */
/* jata hai. Ek transaction me, taaki aadha delete na ho.               */
/* ------------------------------------------------------------------ */

export const deleteOwner = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    const confirmEmail = String(req.body?.confirmEmail || "")
      .trim()
      .toLowerCase();

    if (confirmEmail !== owner.email) {
      return fail(
        res,
        400,
        "Confirmation email does not match. Type the owner's email to delete."
      );
    }

    const ownerId = owner._id;
    const deleted = {};
    const snapshot = { _id: owner._id, name: owner.name, email: owner.email };

    await session.withTransaction(async () => {
      const del = async (key, model, filter) => {
        const result = await model.deleteMany(filter, { session });
        deleted[key] = result.deletedCount || 0;
      };

      // Pehle bachhe (data), phir drivers, aakhir me owner
      await del("allocations", FarmerAdvanceAllocation, { owner: ownerId });
      await del("ledger", FarmerAdvanceLedger, { owner: ownerId });
      await del("lots", FarmerAdvanceLot, { owner: ownerId });
      await del("payments", Payment, { owner: ownerId });
      await del("works", WorkLog, { owner: ownerId });
      await del("farmers", Farmer, { owner: ownerId });
      await del("expenses", Expense, { owner: ownerId });
      await del("workRates", WorkRate, { owner: ownerId });
      await del("drivers", User, { role: "driver", owner: ownerId });

      await User.deleteOne({ _id: ownerId, role: "owner" }, { session });
    });

    await audit(req, "DELETE", snapshot, { deleted });

    return res.status(200).json({
      success: true,
      message: "Owner and all related data deleted permanently.",
      deleted,
    });
  } catch (error) {
    console.error("deleteOwner error:", error);
    return fail(res, 500, "Failed to delete owner. Nothing was deleted.");
  } finally {
    await session.endSession();
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/admin/owners/:id/export                                     */
/* Owner ka poora data ek JSON file me (delete se pehle backup).        */
/* Password hash kabhi file me nahi jata.                               */
/* ------------------------------------------------------------------ */

export const exportOwnerData = async (req, res) => {
  try {
    const owner = await findOwnerOr404(req.params.id, res);
    if (!owner) return;

    const ownerId = owner._id;

    const [
      drivers,
      farmers,
      works,
      payments,
      expenses,
      workRates,
      advanceLots,
      advanceLedger,
      advanceAllocations,
    ] = await Promise.all([
      User.find({ role: "driver", owner: ownerId }).select("-password").lean(),
      Farmer.find({ owner: ownerId }).lean(),
      WorkLog.find({ owner: ownerId }).lean(),
      Payment.find({ owner: ownerId }).lean(),
      Expense.find({ owner: ownerId }).lean(),
      WorkRate.find({ owner: ownerId }).lean(),
      FarmerAdvanceLot.find({ owner: ownerId }).lean(),
      FarmerAdvanceLedger.find({ owner: ownerId }).lean(),
      FarmerAdvanceAllocation.find({ owner: ownerId }).lean(),
    ]);

    const { password, ...safeOwner } = owner.toObject();

    const payload = {
      exportedAt: new Date().toISOString(),
      counts: {
        drivers: drivers.length,
        farmers: farmers.length,
        works: works.length,
        payments: payments.length,
        expenses: expenses.length,
        workRates: workRates.length,
        advanceLots: advanceLots.length,
        advanceLedger: advanceLedger.length,
        advanceAllocations: advanceAllocations.length,
      },
      owner: safeOwner,
      drivers,
      farmers,
      works,
      payments,
      expenses,
      workRates,
      advanceLots,
      advanceLedger,
      advanceAllocations,
    };

    await audit(req, "EXPORT", owner, { counts: payload.counts });

    const safeName = owner.email.replace(/[^a-z0-9]+/gi, "-");
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="owner-${safeName}-${stamp}.json"`
    );

    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("exportOwnerData error:", error);
    return fail(res, 500, "Failed to export owner data.");
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/admin/audit?limit=  (admin ki recent activity)              */
/* ------------------------------------------------------------------ */

export const getAuditLog = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 1, 100, 20);

    const logs = await AdminAudit.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("getAuditLog error:", error);
    return fail(res, 500, "Failed to load audit log.");
  }
};