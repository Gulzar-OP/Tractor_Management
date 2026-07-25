import express from "express";
import {
  addExpense,
  allExpenses,
  getExpenseById,
  deleteExpense,
} from "../controllers/expenses.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all-expenses",protect, allExpenses);
router.post("/add",protect, addExpense);

router.get("/:id",protect, getExpenseById);
router.delete("/:id",protect, deleteExpense);

export default router;