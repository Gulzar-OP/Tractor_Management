
import express from "express";
import {
  addPayment,
  deletePayment,
  updatePayment,
  getPaymentRecords,
  receiveFarmerAdvance,
} from "../controllers/payment.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/advance", protect, receiveFarmerAdvance);
router.post("/", protect, addPayment);
router.get("/records", protect, getPaymentRecords);
router.patch("/:id", protect, updatePayment);
router.delete("/:id", protect, deletePayment);

export default router;
