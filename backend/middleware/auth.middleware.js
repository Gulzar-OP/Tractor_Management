import jwt from "jsonwebtoken";


export const protect = (req, res, next) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized - Token missing",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    req.ownerId =
      decoded.ownerId ||
      (decoded.role === "owner"
        ? decoded.id || decoded._id
        : null);

    console.log("PROTECT MIDDLEWARE:", {
      path: req.originalUrl,
      method: req.method,
      user: req.user,
      ownerId: req.ownerId,
    });

    if (!req.ownerId) {
      return res.status(401).json({
        success: false,
        message: "Owner ID missing from token",
      });
    }

    next();
  } catch (err) {
    console.error("Auth Error:", err.message);

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