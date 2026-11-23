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

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fixed/static routes MUST come before dynamic "/:id" routes,
// otherwise Express matches "/search" as an :id param.
router.get("/search", protect, searchFarmers);
router.get("/totalEarning", earningTotal);
router.get("/totalDues", duesTotal);
router.get("/todayEarning", todayEarnings);
router.get("/dues", getFarmersWithDues);
router.get("/all/farmerHistory", allFarmerHistory);

router.post("/", protect,createFarmer);
router.post("/all-farmer",protect, allFarmers);
router.put("/update/:id", updateFarmer);
router.delete("/deleteFarmer/:id", protect, deleteFarmer);
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
router.get("/:id/history", getFarmerHistory);
router.get("/:id", getFarmerById);

export default router;