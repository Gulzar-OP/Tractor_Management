// Email bhejne ka helper (nodemailer). npm i nodemailer
// .env me ye daalo (Gmail example):
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=tumhara@gmail.com
//   SMTP_PASS=<Gmail App Password>   (normal password nahi, 2-step ke baad App Password)
//   MAIL_FROM="Tractor App <tumhara@gmail.com>"
// SMTP set nahi hai to email nahi jata, link server console me print hota hai (sirf development ke liye).
import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: (Number(SMTP_PORT) || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  if (!t) {
    console.warn("[sendEmail] SMTP set nahi hai. Email nahi gaya.");
    console.warn(`To: ${to}\nSubject: ${subject}\n${text}`);
    return false;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
};