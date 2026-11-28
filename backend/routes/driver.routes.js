import express from "express";
import {
  addDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  me,
} from "../controllers/driver.controller.js";

import { protect,isOwner } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/add", protect, isOwner, addDriver);

router.get("/me",protect,me)

router.get("/all", protect, getAllDrivers);

router.get("/:id", protect, getDriverById);

router.put("/:id", protect, isOwner, updateDriver);

router.delete("/:id", protect, isOwner, deleteDriver);


export default router;