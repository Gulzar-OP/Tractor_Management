import express from "express";
import {
  getRates,
  updateRates,
  getProfile,
  updateProfile,
  addRates,
  getRateByType,
  deleteRate,
} from "../controllers/workRate.controller.js";

import { protect, isOwner } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/rates", protect, getRates);
// Rates badalna / jodna / hatana sirf owner (driver sirf rates padh sakta hai)
router.put("/rates", protect, isOwner, updateRates);
router.post("/", protect, isOwner, addRates);
router.delete("/:id", protect, isOwner, deleteRate);
router.post("/get-rate", protect, getRateByType);
router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);


export default router;
