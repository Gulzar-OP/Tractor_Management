import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { dateWiseReport } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/date-wise", protect, dateWiseReport);

export default router;