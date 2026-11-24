import express from "express";
import {
  allFarmers,
  createFarmer,
  earningTotal,
  getFarmerById,
  getFarmerHistory,
  getFarmersWithDues,
  updateFarmer,
  duesTotal,
  todayEarnings,
  deleteFarmer,
  allFarmerHistory,
  searchFarmers,
  getFarmerAdvanceReconciliation,
  getFarmerAdvanceHistory
} from "../controllers/farmer.controller.js";

import { isOwner, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fixed/static routes MUST come before dynamic "/:id" routes,
// otherwise Express matches "/search" as an :id param.
router.get("/search", protect, searchFarmers);
router.get("/totalEarning", protect,earningTotal);
router.get("/totalDues",protect, duesTotal);
router.get("/todayEarning", protect, todayEarnings);
router.get("/dues", protect, getFarmersWithDues);
router.get("/all/farmerHistory", protect, allFarmerHistory);

router.post("/", protect,createFarmer);
router.post("/all-farmer",protect, allFarmers);
router.put("/update/:id", protect,isOwner,updateFarmer);
router.delete("/deleteFarmer/:id", protect,isOwner, deleteFarmer);
router.get(
  "/:farmerID/advance-reconciliation",
  protect,
  getFarmerAdvanceReconciliation
);
// Dynamic routes go last
router.get(
  "/advance/:farmerID/ledger",
  protect,
  getFarmerAdvanceHistory
);
router.get("/:id/history", protect, getFarmerHistory);
router.get("/:id",protect, getFarmerById);

export default router;