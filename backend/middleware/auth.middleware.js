import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return unauthorized(res, "Not authorized - Token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return unauthorized(res, "Invalid token");
    }

    // Token ke bharose mat raho: user abhi bhi exist karta hai,
    // active hai, aur role/owner DB ke hisaab se kya hai.
    const user = await User.findById(userId)
      .select("role owner isActive")
      .lean();

    if (!user || user.isActive === false) {
      return unauthorized(res, "Account not found or disabled");
    }

    const ownerId =
      user.role === "owner" ? user._id : user.owner;

    if (!ownerId) {
      return unauthorized(res, "Owner ID missing for this account");
    }

    // Driver ka owner delete/disable ho gaya ho to driver bhi band
    if (user.role === "driver") {
      const owner = await User.findById(ownerId)
        .select("isActive")
        .lean();

      if (!owner || owner.isActive === false) {
        return unauthorized(res, "Owner account not available");
      }
    }

    // DB wali values use karo (stale token role se bachne ke liye)
    req.user = {
      ...decoded,
      userId: String(user._id),
      role: user.role,
      ownerId: String(ownerId),
    };
    req.ownerId = String(ownerId);

    next();
  } catch (err) {
    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError"
    ) {
      return unauthorized(res, "Invalid token");
    }

    console.error("Auth Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const isOwner = (req, res, next) => {
  if (!req.user || req.user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only owner can perform this action.",
    });
  }

  next();
};
export const canManageUpdates = (req, res, next) => {
  if (!req.user || !["owner", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only owner or admin can manage updates.",
    });
  }

  next();
};