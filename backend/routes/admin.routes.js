import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import {
  getPlatformStats,
  listOwners,
  getOwnerDetails,
  updateOwner,
  setOwnerStatus,
  decideOwnerApproval,
  resetOwnerPassword,
  deleteOwner,
  exportOwnerData,
  getAuditLog,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Poore router par: pehle login, phir admin role
router.use(protect, isAdmin);

router.get("/stats", getPlatformStats);
router.get("/audit", getAuditLog);

router.get("/owners", listOwners);
router.get("/owners/:id", getOwnerDetails);
router.get("/owners/:id/export", exportOwnerData);
router.patch("/owners/:id", updateOwner);
router.patch("/owners/:id/approval", decideOwnerApproval);
router.patch("/owners/:id/status", setOwnerStatus);
router.post("/owners/:id/reset-password", resetOwnerPassword);
router.delete("/owners/:id", deleteOwner);

export default router;