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

    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Driver already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      village,
      role: "driver",
      owner: req.ownerId,
    });

    const driverData = driver.toObject();
    delete driverData.password;

    return res.status(201).json({
      success: true,
      message: "Driver added successfully",
      driver: driverData,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= GET ALL DRIVERS =================
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({
      role: "driver",
      owner: req.ownerId,
      isActive: { $ne: false },
    }).select("-password");

    res.status(200).json({
      success: true,
      drivers,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
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
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= UPDATE DRIVER =================
export const updateDriver = async (req, res) => {
  try {
    // Mass assignment se bachne ke liye sirf ye fields allow hain.
    // role / owner / email kabhi body se nahi badlenge.
    const allowed = ["name", "phone", "village", "isActive"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
      if (!updates.name) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
    }

    if (
      updates.isActive !== undefined &&
      typeof updates.isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    if (req.body.password !== undefined) {
      const password = req.body.password;

      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 72
      ) {
        return res.status(400).json({
          success: false,
          message: "Password must be 8-72 characters",
        });
      }

      updates.password = await bcrypt.hash(password, 10);
      updates.passwordChangedAt = new Date();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const driver = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "driver",
        owner: req.ownerId,
      },
      { $set: updates },
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
    console.error("updateDriver error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
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

    // Soft delete: driver ke purane works/payments ka createdBy
    // valid rehta hai, bas wo login nahi kar paayega.
    const driver = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "driver",
        owner: req.ownerId,
      },
      { $set: { isActive: false } },
      { new: true }
    );

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
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
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
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// find driver (scoped: sirf apne owner ka driver)
export const getDriver = async (req, res) => {
  try {
    const driver = await User.findOne({
      _id: req.params._id,
      role: "driver",
      owner: req.ownerId,
    }).select("-password");

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