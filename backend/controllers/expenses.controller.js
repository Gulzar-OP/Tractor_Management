import mongoose from "mongoose";
import Expense from "../models/expenses.model.js";

// Kharcha hamesha owner ke naam par jaata hai (driver ka bhi),
// isliye req.user.userId nahi, req.ownerId use hota hai.

// POST /api/expenses/add
export const addExpense = async (req, res) => {
  try {
    const owner = req.ownerId;
    const { type, amount, date, notes } = req.body;

    const value = Number(amount);

    if (!type || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        success: false,
        message: "Type and a valid amount are required",
      });
    }

    const expense = await Expense.create({
      owner,
      type,
      amount: value,
      date,
      notes,
    });

    return res.status(201).json({ success: true, message: "Expense added successfully", expense });
  } catch (err) {
    console.error("addExpense error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/expenses/all-expenses
export const allExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ owner: req.ownerId }).sort({ date: -1 });
    return res.status(200).json({ success: true, expenses });
  } catch (err) {
    console.error("allExpenses error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/expenses/:id
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }

    const expense = await Expense.findOne({ _id: id, owner: req.ownerId });

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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }

    const deleted = await Expense.findOneAndDelete({ _id: id, owner: req.ownerId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    return res.status(200).json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    console.error("deleteExpense error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};