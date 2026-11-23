import express from "express";
import {
  startWork,
  addWork,
  pauseWork,
  resumeWork,
  stopWork,
  getAllWorks,
  workDetails,
  updateWork,
  deleteWork,
  cancelWork,
} from "../controllers/work.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", protect, startWork);
router.post("/add", protect, addWork);
router.get("/all-works", protect, getAllWorks);

router.get("/details/:id", protect, workDetails);

router.post("/:id/pause", protect, pauseWork);
router.post("/:id/resume", protect, resumeWork);
router.post("/:id/stop", protect, stopWork);
router.delete(
  "/:id",
  protect,
  deleteWork
);
router.put("/:id", protect, updateWork);
router.post("/:id/cancel", protect, cancelWork);

export default router;