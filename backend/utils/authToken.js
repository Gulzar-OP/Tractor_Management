// Session settings: 7 din sliding, 30 din absolute limit.
// Place: utils/authToken.js (ya jahan aapke utils hain)
import jwt from "jsonwebtoken";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_DAYS = 7; // use karte raho to har baar itne din aage badhta hai
export const MAX_SESSION_DAYS = 30; // chahe roz use ho, itne din baad dobara login
export const SESSION_MAX_AGE_MS = SESSION_DAYS * DAY_MS;
export const MAX_SESSION_MS = MAX_SESSION_DAYS * DAY_MS;

// loginAt = pehli baar login ka time (ms). Refresh par wahi rehta hai.
export const signAuthToken = (payload, loginAt = Date.now()) =>
  jwt.sign({ ...payload, loginAt }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });

// Token ki umar aadhi se zyada ho gayi ho to naya token chahiye
export const needsRefresh = (decoded) => {
  const issuedAtMs = (decoded.iat || 0) * 1000;
  return Date.now() - issuedAtMs > SESSION_MAX_AGE_MS / 2;
};

// Purane tokens (loginAt nahi) ke liye iat se kaam chalao
export const getLoginAt = (decoded) =>
  Number(decoded.loginAt) || (decoded.iat || 0) * 1000;

export const isPastMaxSession = (decoded) =>
  Date.now() - getLoginAt(decoded) > MAX_SESSION_MS;