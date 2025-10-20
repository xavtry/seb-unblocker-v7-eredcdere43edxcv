
/**
 * throttler.js
 *
 * Handles rate limiting and throttling for Seb-Unblocker V7
 * Features:
 *  - Limits requests per IP/session
 *  - Prevents abuse
 *  - Supports burst handling
 *  - Logs throttled requests
 *  - Can be extended for weighted throttling per route
 */

const { logger } = require('./logger');

const RATE_LIMIT = 100; // max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window
const bursts = 5; // allowed burst
const ipStore = new Map();

/**
 * Clean old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipStore.entries()) {
    data.timestamps = data.timestamps.filter(ts => now - ts < WINDOW_MS);
    if (data.timestamps.length === 0) ipStore.delete(ip);
  }
}, WINDOW_MS);

/**
 * Register request from IP
 */
function registerRequest(ip) {
  const now = Date.now();
  if (!ipStore.has(ip)) ipStore.set(ip, { timestamps: [] });
  ipStore.get(ip).timestamps.push(now);
}

/**
 * Check if IP is allowed
 */
function isAllowed(ip) {
  if (!ipStore.has(ip)) return true;
  const timestamps = ipStore.get(ip).timestamps;
  const recentCount = timestamps.filter(ts => Date.now() - ts < WINDOW_MS).length;
  return recentCount <= RATE_LIMIT + bursts;
}

/**
 * Middleware for Express
 */
function throttleMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  registerRequest(ip);

  if (!isAllowed(ip)) {
    logger.logWarning(`IP throttled: ${ip}`);
    return res.status(429).send('Too many requests, please try again later.');
  }

  next();
}

/**
 * Reset IP count manually (for admin)
 */
function resetIP(ip) {
  ipStore.delete(ip);
}

/**
 * Get current stats for an IP
 */
function getIPStats(ip) {
  if (!ipStore.has(ip)) return { requests: 0 };
  return { requests: ipStore.get(ip).timestamps.length };
}

module.exports = {
  throttleMiddleware,
  registerRequest,
  isAllowed,
  resetIP,
  getIPStats
};
