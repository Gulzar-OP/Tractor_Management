// SMTP check: node scripts/testEmail.js apna@email.com
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

const to = process.argv[2];
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

console.log("SMTP_HOST:", SMTP_HOST || "❌ KHALI");
console.log("SMTP_PORT:", SMTP_PORT || "(default 465)");
console.log("SMTP_USER:", SMTP_USER || "❌ KHALI");
console.log("SMTP_PASS:", SMTP_PASS ? `set (${SMTP_PASS.replace(/\s/g, "").length} chars, 16 hone chahiye)` : "❌ KHALI");
console.log("MAIL_FROM:", MAIL_FROM || "(SMTP_USER use hoga)");

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !to) {
  console.error('\n❌ Upar ki khali values .env me bharo. Usage: node scripts/testEmail.js email');
  process.exit(1);
}

const port = Number(SMTP_PORT) || 465;
const t = nodemailer.createTransport({
  host: SMTP_HOST, port, secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, "") },
});

try {
  await t.verify();
  console.log("✅ SMTP login ok");
  const info = await t.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject: "Test email", text: "Email setup sahi hai." });
  console.log("✅ Email bhej diya:", info.response);
} catch (e) {
  console.error("❌ Fail:", e.message);
}