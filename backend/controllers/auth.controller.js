import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import { signAuthToken, SESSION_MAX_AGE_MS } from "../utils/authToken.js";

const isProduction = process.env.NODE_ENV === "production";

// User na milne par bhi bcrypt chalao, taaki response time se
// pata na chale ki email registered hai ya nahi.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

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
      approvalStatus: "pending", // admin approve karega tab login hoga
    });

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message:
        "Registration ho gayi. Admin approval ke baad aap login kar payenge.",
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
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );

    // Email galat ho ya password, dono me ek jaisa jawab
    if (!user || !isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled. Contact your owner.",
      });
    }

    // Password sahi hone ke BAAD hi approval ka status batate hain
    // (taaki bina password ke koi email ka status na jaan sake)
    if (user.approvalStatus === "pending") {
      return res.status(403).json({
        success: false,
        code: "PENDING_APPROVAL",
        message:
          "Aapka account abhi admin ki approval ka intezaar kar raha hai. Approve hone ke baad login kar payenge.",
      });
    }

    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        success: false,
        code: "REJECTED",
        message: user.rejectionReason
          ? `Aapki registration approve nahi hui: ${user.rejectionReason}`
          : "Aapki registration approve nahi hui. Admin se sampark karo.",
      });
    }

    const token = signAuthToken({
      userId: user._id,
      role: user.role,
      ownerId: user.role === "owner" ? user._id : user.owner,
    });

    return res
      .cookie("authToken", token, {
        ...cookieOptions,
        maxAge: SESSION_MAX_AGE_MS,
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
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("authToken", cookieOptions);

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
    console.error("me error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const allDriver = async (req, res) => {
  try {
    const drivers = await User.find({
      owner: req.ownerId,
      role: "driver",
      isActive: { $ne: false },
    }).select("-password");

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    console.error("allDriver error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};