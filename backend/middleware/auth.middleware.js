import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import {
  signAuthToken,
  needsRefresh,
  isPastMaxSession,
  getLoginAt,
  SESSION_MAX_AGE_MS,
} from "../utils/authToken.js";

// cookieOptions auth.controller.js jaise hi rakho (httpOnly, sameSite, secure)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

// Sliding session: token aadhe se zyada purana ho to naya 7 din ka token do
// (loginAt wahi rehta hai, isliye 30 din ki limit nahi badhti)
const refreshSession = (res, decoded, user, ownerId) => {
  if (!needsRefresh(decoded)) return;

  const fresh = signAuthToken(
    { userId: user._id, role: user.role, ownerId },
    getLoginAt(decoded)
  );

  res.cookie("authToken", fresh, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_MS,
  });
};

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return unauthorized(res, "Not authorized - Token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 30 din ki absolute limit: roz use karne par bhi uske baad dobara login
    if (isPastMaxSession(decoded)) {
      res.clearCookie("authToken", cookieOptions);
      return unauthorized(res, "Session expired - please login again");
    }

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

    // Admin kisi owner ke under nahi hota: sirf /api/admin routes chalta hai
    // (wahan isAdmin lagta hai). ownerId null rehta hai, isliye owner wale
    // data routes par admin ko kuch nahi milta.
    if (user.role === "admin") {
      req.user = {
        ...decoded,
        userId: String(user._id),
        role: "admin",
        ownerId: null,
      };
      req.ownerId = null;
      refreshSession(res, decoded, user, null);
      return next();
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

    // Sliding session: token aadhe se zyada purana ho to naya 7 din ka token do
    // (loginAt wahi rehta hai, isliye 30 din ki limit nahi badhti)
    refreshSession(res, decoded, user, ownerId);

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


export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
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