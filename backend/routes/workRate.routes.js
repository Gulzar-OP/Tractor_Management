import express from "express";
import {
  getRates,
  updateRates,
  getProfile,
  updateProfile,
  addRates,
  getRateByType,
} from "../controllers/workRate.controller.js";

// Replace this with whatever middleware already guards your
// /api/farmer/* and /api/auth/me routes (e.g. verifyOwner, protect...).
// It just needs to set req.owner (or req.user) from the auth cookie.
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/rates", protect, getRates);
router.put("/rates", protect, updateRates);
router.post("/",protect,addRates)
router.post("/get-rate", protect, getRateByType);
router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);


export default router;

// In your main app/server file, mount this with:
//   import settingsRoutes from "./routes/settingsRoutes.js";
//   app.use("/api/settings", settingsRoutes);