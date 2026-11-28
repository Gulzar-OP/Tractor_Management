import express from "express";
import { allDriver, login, logout, me, register } from "../controllers/auth.controller.js";
import { forgotPassword, resetPassword } from "../controllers/passwordReset.controller.js";
import { isOwner, protect } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const loginLimiter = rateLimit({ max: 10 });
const registerLimiter = rateLimit({ max: 5, windowMs: 60 * 60 * 1000 });
const forgotLimiter = rateLimit({ max: 5, windowMs: 60 * 60 * 1000 });
const resetLimiter = rateLimit({ max: 10, windowMs: 60 * 60 * 1000 });

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotLimiter, forgotPassword);
router.post("/reset-password/:token", resetLimiter, resetPassword);
router.get("/me", protect, me);
router.post("/logout", logout);
router.post("/all-driver", protect, isOwner, allDriver);

export default router;