import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { tractorStatus, updateTractor } from "../controllers/tractor.controller.js";

const router = express.Router();

router.get("/status", protect, tractorStatus);
router.patch("/details", protect, updateTractor);

export default router;