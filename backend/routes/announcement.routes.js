
import express from "express";

import {
  createAnnouncement,
  getAllAnnouncements,
  getAdminAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  toggleAnnouncementPublish,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.get("/", protect, getAllAnnouncements);
router.get("/:id", protect, getAnnouncementById);

// Owner + Admin routes
router.post("/", protect, isAdmin, createAnnouncement);

router.get(
  "/admin/all",
  protect,
  isAdmin,
  getAdminAnnouncements
);

router.put(
  "/:id",
  protect,
  isAdmin,
  updateAnnouncement
);

router.patch(
  "/:id/publish",
  protect,
  isAdmin,
  toggleAnnouncementPublish
);

router.delete(
  "/:id",
  protect,
  isAdmin,
  deleteAnnouncement
);

export default router;