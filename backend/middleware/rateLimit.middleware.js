// Simple in-memory rate limiter (koi extra package nahi chahiye).
// Ek hi server instance par chalta hai; multiple servers ho to express-rate-limit + Redis lo.
export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.reset <= now) e = { count: 0, reset: now + windowMs };
    e.count += 1;
    hits.set(key, e);

    if (e.count > max) {
      res.set("Retry-After", String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({
        success: false,
        message: message || "Bahut zyada koshish. Thodi der baad dobara try karo.",
      });
    }
    next();
  };
};
