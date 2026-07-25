import express from "express";
import {
  startWork,
  pauseWork,
  resumeWork,
  stopWork,
  getAllWorks,
  addWork,
  workDetails
} from "../controllers/work.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", startWork);
router.post("/add",protect,addWork)
router.get("/details/:id", workDetails);
router.post("/all-works",protect, getAllWorks);
router.post("/:id/pause", pauseWork);
router.post("/:id/resume",  resumeWork);
router.post("/:id/stop", stopWork);
// router.get("/details/:id", getWorkDetails);


export default router;
