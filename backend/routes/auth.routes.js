import express from "express";
import { allDriver, login, logout, me, register } from "../controllers/auth.controller.js";
import { isOwner, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me",protect ,me)
router.post("/logout",logout)
router.post("/all-driver",protect,isOwner, allDriver)


export default router;
