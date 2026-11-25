
import mongoose from "mongoose";
import Announcement from "../models/announcement.model.js";

// Create announcement (Owner only)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, description, version, type } = req.body;

    if (!title || !description || !version || !type) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!["feature", "improvement", "bugfix"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement type",
      });
    }

    const userId =
      req.user.userId || req.user.id || req.user._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid creator ID",
      });
    }

    const announcement = await Announcement.create({
      title,
      description,
      version,
      type,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("createAnnouncement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create announcement",
    });
  }
};


// Get all published announcements (Owner + Driver)
export const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isPublished: true,
    })
      .sort({ publishedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    console.error("getAllAnnouncements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
    });
  }
};


// Get all announcements including drafts (Owner only)
export const getAdminAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    console.error("getAdminAnnouncements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
    });
  }
};


// Get single announcement
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    const announcement = await Announcement.findOne({
      _id: id,
      isPublished: true,
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      announcement,
    });
  } catch (error) {
    console.error("getAnnouncementById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcement",
    });
  }
};


// Update announcement (Owner only)
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, version, type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    if (type && !["feature", "improvement", "bugfix"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement type",
      });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(version !== undefined && { version }),
        ...(type !== undefined && { type }),
      },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("updateAnnouncement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update announcement",
    });
  }
};


// Publish / Unpublish announcement (Owner only)
export const toggleAnnouncementPublish = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isPublished = !announcement.isPublished;

    announcement.publishedAt = announcement.isPublished
      ? new Date()
      : null;

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: announcement.isPublished
        ? "Announcement published successfully"
        : "Announcement unpublished successfully",
      announcement,
    });
  } catch (error) {
    console.error("toggleAnnouncementPublish error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update publish status",
    });
  }
};


// Delete announcement (Owner only)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("deleteAnnouncement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
    });
  }
};
