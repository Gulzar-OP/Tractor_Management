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

import { protect, isOwner } from "../middleware/auth.middleware.js";
import { dueSummary } from "../controllers/dueSummary.controller.js";

const router = express.Router();

router.post("/start", protect, startWork);
router.post("/add", protect, addWork);
router.get("/all-works", protect, getAllWorks);

router.get("/details/:id", protect, workDetails);

router.post("/:id/pause", protect, pauseWork);
router.post("/:id/resume", protect, resumeWork);
router.post("/:id/stop", protect, stopWork);
// Work delete sirf owner kar sakta hai (driver sirf cancel kar sakta hai)
router.delete("/:id", protect, isOwner, deleteWork);
router.put("/:id", protect, updateWork);
router.post("/:id/cancel", protect, cancelWork);

router.get("/due-summary", protect, dueSummary);

export default router;