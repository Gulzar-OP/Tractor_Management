import express from "express";

import {
  saveMachines,
} from "../controllers/machine.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/add", protect,
  saveMachines
);

export default router;