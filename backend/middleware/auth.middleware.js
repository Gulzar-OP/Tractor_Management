import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // console.log("Decoded Token:", decoded);

    req.user = decoded;

    // Owner ki apni ID ownerId hogi
    // Driver ke liye token mein ownerId honi chahiye
    req.ownerId =
      decoded.ownerId ||
      (decoded.role === "owner" ? decoded.id || decoded._id : null);

    if (!req.ownerId) {
      return res.status(401).json({
        success: false,
        message: "Owner ID missing from token",
      });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
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