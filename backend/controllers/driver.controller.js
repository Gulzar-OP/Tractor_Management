import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

// ================= ADD DRIVER =================
export const addDriver = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can add drivers",
      });
    }

    const { name, email, password, phone, village } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Driver already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      village,
      role: "driver",
      owner: req.ownerId,
    });

    res.status(201).json({
      success: true,
      message: "Driver added successfully",
      driver,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET ALL DRIVERS =================
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({
      role: "driver",
      owner: req.ownerId,
    }).select("-password");

    res.status(200).json({
      success: true,
      drivers,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= GET SINGLE DRIVER =================
export const getDriverById = async (req, res) => {
  try {
    const driver = await User.findOne({
      _id: req.params.id,
      role: "driver",
      owner: req.ownerId,
    }).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      driver,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= UPDATE DRIVER =================
export const updateDriver = async (req, res) => {
  try {
    const driver = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "driver",
        owner: req.ownerId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver updated",
      driver,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= DELETE DRIVER =================
export const deleteDriver = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can delete drivers",
      });
    }

    const driver = await User.findOneAndDelete({
      _id: req.params.id,
      role: "driver",
      owner: req.ownerId,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// find driver
export const getDriver = async (req, res) => {
  try {
    const driver = await User.findById(req.params._id).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    return res.status(200).json({
      success: true,
      driver,
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};