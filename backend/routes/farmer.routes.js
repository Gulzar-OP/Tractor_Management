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
  searchFarmers
} from "../controllers/farmer.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fixed/static routes MUST come before dynamic "/:id" routes,
// otherwise Express matches "/search" as an :id param.
router.get("/totalEarning", earningTotal);
router.get("/totalDues", duesTotal);
router.get("/todayEarning", todayEarnings);
router.get("/dues", getFarmersWithDues);
router.get("/search", searchFarmers); // moved above "/:id"
router.get("/all/farmerHistory", allFarmerHistory);

router.post("/", protect,createFarmer);
router.post("/all-farmer",protect, allFarmers);
router.put("/update/:id", updateFarmer);
router.delete("/deleteFarmer/:id", deleteFarmer);

// Dynamic routes go last
router.get("/:id/history", getFarmerHistory);
router.get("/:id", getFarmerById);

export default router;