import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";

const TOKEN_MINUTES = 30;

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

// Hamesha ek jaisa jawab: email registered hai ya nahi, bahar se pata na chale
const GENERIC = {
  success: true,
  message:
    "Agar ye email registered hai to password reset ka link bhej diya gaya hai. Inbox aur spam dono dekho.",
};

export const forgotPassword = async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email daalo" });
    }

    const user = await User.findOne({ email });

    // Sirf active aur approved user ko link jata hai (admin bhi apna reset kar sakta hai)
    if (user && user.isActive !== false && user.approvalStatus !== "pending" && user.approvalStatus !== "rejected") {
      const rawToken = crypto.randomBytes(32).toString("hex");

      user.resetPasswordTokenHash = sha256(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + TOKEN_MINUTES * 60 * 1000);
      await user.save();

      const base = (process.env.FRONTEND_URL || process.env.API_Frontend || "http://localhost:5173").replace(/\/$/, "");
      const link = `${base}/reset-password/${rawToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Password reset - Tractor App",
          text: `Namaste ${user.name},\n\nPassword reset karne ke liye ye link kholo (${TOKEN_MINUTES} minute tak valid):\n${link}\n\nAgar aapne ye request nahi ki to is email ko ignore kar do, aapka password nahi badla hai.`,
          html: `<p>Namaste ${String(user.name).replace(/[<>&]/g, "")},</p><p>Password reset karne ke liye neeche button dabao (${TOKEN_MINUTES} minute tak valid):</p><p><a href="${link}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Password reset karo</a></p><p>Agar button na chale to ye link browser me kholo:<br>${link}</p><p>Agar aapne ye request nahi ki to is email ko ignore kar do.</p>`,
        });
      } catch (mailErr) {
        // User ko error mat dikhao (email enumeration), bas log karo
        console.error("forgotPassword email failed:", mailErr.message);
      }
    }

    return res.status(200).json(GENERIC);
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = typeof req.params.token === "string" ? req.params.token : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ success: false, message: "Password 8 se 72 characters ka hona chahiye" });
    }

    const user = await User.findOne({
      resetPasswordTokenHash: sha256(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Link galat ya expire ho gaya. Dobara 'Forgot password' se naya link lo.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date(); // purani sessions logout
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password badal gaya. Ab naye password se login karo.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};