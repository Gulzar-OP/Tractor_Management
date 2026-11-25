import express from "express";
import {
  addExpense,
  allExpenses,
  getExpenseById,
  deleteExpense,
} from "../controllers/expenses.controller.js";
import { protect, isOwner } from "../middleware/auth.middleware.js";

const router = express.Router();

// Driver kharcha add kar sakta hai, par list/delete sirf owner
// (report me bhi kharcha sirf owner ko dikhta hai).
router.post("/add", protect, addExpense);

router.get("/all-expenses", protect, isOwner, allExpenses);
router.get("/:id", protect, isOwner, getExpenseById);
router.delete("/:id", protect, isOwner, deleteExpense);

export default router;