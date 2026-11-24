import mongoose from "mongoose";
import User from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const isProduction = process.env.NODE_ENV === "production";

export const register = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ success: false, message: "Password must be 8-72 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // role force "owner", owner field nahi (login me owner ki apni _id ownerId banti hai)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }
    console.error("register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    console.log("Login email:", email);
    console.log("Database:", mongoose.connection.name);

    const user = await User.findOne({ email });

    console.log("Found user:", user ? user.email : "Not found");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    console.log("1. User found");
console.log("2. Password match:", isMatch);

const token = jwt.sign(
  {
    userId: user._id,
    role: user.role,
    ownerId: user.role === "owner" ? user._id : user.owner,
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
return res
  .cookie("authToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  .json({
    success: true,
    message: "Login successful",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

    // const token = jwt.sign(
    //   {
    //     userId: user._id,
    //     role: user.role,
    //     ownerId: user.role === "owner" ? user._id : user.owner,
    //   },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "7d" }
    // );

    // return res
    //   .cookie("authToken", token, {
    //     httpOnly: true,
    //     secure: isProduction,
    //     sameSite: isProduction ? "none" : "lax",
    //     maxAge: 7 * 24 * 60 * 60 * 1000,
    //   })
    //   .json({
    //     success: true,
    //     message: "Login successful",
    //     user: {
    //       _id: user._id,
    //       name: user.name,
    //       email: user.email,
    //       role: user.role,
    //     },
    //   });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const logout = (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
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

export const allDriver = async (req, res) => {
  try {
    const drivers = await User.find({
      owner: req.ownerId,
      role: "driver",
    }).select("-password");

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};