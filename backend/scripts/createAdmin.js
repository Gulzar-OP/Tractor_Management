// Admin account banane ki script. Register API se admin nahi bante (wo hamesha "owner" banata hai).
//
// Chalane ka tareeka (backend folder me):
//   node scripts/createAdmin.js "Admin Name" admin@example.com "StrongPassword123"
//
// Pehle se us email ka user ho to ye script kuch nahi badalti.
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";

dotenv.config();

const [, , name, emailArg, password] = process.argv;
const email = String(emailArg || "").trim().toLowerCase();

if (!name || !email || !password) {
  console.error('Usage: node scripts/createAdmin.js "Name" email password');
  process.exit(1);
}

if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Invalid email.");
  process.exit(1);
}

if (password.length < 8 || password.length > 72) {
  console.error("Password must be 8-72 characters.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const existing = await User.findOne({ email });

  if (existing) {
    console.error(`A user with ${email} already exists (role: ${existing.role}). Nothing changed.`);
    process.exit(1);
  }

  const admin = await User.create({
    name: name.trim(),
    email,
    password: await bcrypt.hash(password, 10),
    role: "admin",
  });

  console.log(`Admin created: ${admin.email} (${admin._id})`);
} catch (error) {
  console.error("Failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}