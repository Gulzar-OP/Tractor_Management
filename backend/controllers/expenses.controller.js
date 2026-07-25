import mongoose from "mongoose";
import Expense from "../models/expenses.model.js"; // adjust path to match your project

// POST /api/expenses/add
export const addExpense = async (req, res) => {
  try {
    const owner = req.user.userId;
    const { type, amount, date, notes } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ success: false, message: "Type and amount are required" });
    }

    const expense = await Expense.create({ owner, type, amount, date, notes });
    return res.status(201).json({ success: true, message: "Expense added successfully", expense });
  } catch (err) {
    console.error("addExpense error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/expenses/all-expenses
export const allExpenses = async (req, res) => {
  try {
    const owner = req.user.userId;
    const expenses = await Expense.find({ owner }).sort({ date: -1 });
    return res.status(200).json({ success: true, expenses });
  } catch (err) {
    console.error("allExpenses error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/expenses/:id
export const getExpenseById = async (req, res) => {
  try {
    const owner = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }

    // Scope the lookup to the logged-in user's own expenses.
    // If the id exists but belongs to someone else, this still returns
    // null (same as "not found"), so we don't leak whether the id exists.
    const expense = await Expense.findOne({ _id: id, owner });

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    return res.status(200).json({ success: true, expense });
  } catch (err) {
    console.error("getExpenseById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  try {
    const owner = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }

    // Only deletes if the expense belongs to the logged-in user.
    const deleted = await Expense.findOneAndDelete({ _id: id, owner });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    return res.status(200).json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    console.error("deleteExpense error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};