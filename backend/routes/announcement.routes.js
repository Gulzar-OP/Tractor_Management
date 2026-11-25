
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

import { protect, isOwner, canManageUpdates } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.get("/", protect, getAllAnnouncements);
router.get("/:id", protect, getAnnouncementById);

// Owner + Admin routes
router.post("/", protect, canManageUpdates, createAnnouncement);

router.get(
  "/admin/all",
  protect,
  canManageUpdates,
  getAdminAnnouncements
);

router.put(
  "/:id",
  protect,
  canManageUpdates,
  updateAnnouncement
);

router.patch(
  "/:id/publish",
  protect,
  canManageUpdates,
  toggleAnnouncementPublish
);

router.delete(
  "/:id",
  protect,
  canManageUpdates,
  deleteAnnouncement
);

export default router;
