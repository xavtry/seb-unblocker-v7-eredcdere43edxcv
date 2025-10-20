/**
 * notifications.js
 *
 * Handles notifications for Seb-Unblocker V7
 * Features:
 *  - Sends alerts to admin (email / WS / logging)
 *  - Can notify on proxy errors, abuse, or unusual activity
 *  - Supports throttling notifications
 *  - Stores history of notifications
 *  - Supports custom formatting
 */

const { logger } = require('./loggerDB');
const { notifySession, broadcast } = require('./websocketHandler');

const NOTIFY_HISTORY = [];
const THROTTLE_WINDOW = 60 * 1000; // 1 min
const THROTTLE_LIMIT = 5;
const recentNotifications = new Map(); // type -> timestamps

/**
 * Send notification to admin
 */
function notifyAdmin(type, message) {
  if (!throttle(type)) return;

  const payload = { type, message, timestamp: Date.now() };
  logger.logInfo(`Admin notification: ${message}`);
  NOTIFY_HISTORY.push(payload);

  // For real setup, integrate email or push service here
  broadcast(payload);
}

/**
 * Send session-specific notification
 */
function notifyUser(sessionId, type, message) {
  const payload = { type, message, timestamp: Date.now() };
  NOTIFY_HISTORY.push(payload);
  notifySession(sessionId, `${type}: ${message}`);
}

/**
 * Throttle notifications
 */
function throttle(type) {
  const now = Date.now();
  if (!recentNotifications.has(type)) recentNotifications.set(type, []);
  const timestamps = recentNotifications.get(type);
  const filtered = timestamps.filter(ts => now - ts < THROTTLE_WINDOW);
  if (filtered.length >= THROTTLE_LIMIT) return false;
  filtered.push(now);
  recentNotifications.set(type, filtered);
  return true;
}

/**
 * Get notification history
 */
function getHistory({ type = null, since = null } = {}) {
  let history = NOTIFY_HISTORY;
  if (type) history = history.filter(n => n.type === type);
  if (since) history = history.filter(n => n.timestamp >= new Date(since).getTime());
  return history;
}

/**
 * Example alert for proxy error
 */
function alertProxyError(url, error) {
  notifyAdmin('proxy-error', `Error on ${url}: ${error}`);
}

/**
 * Example alert for suspicious activity
 */
function alertSuspicious(ip, reason) {
  notifyAdmin('suspicious', `IP ${ip} triggered alert: ${reason}`);
}

module.exports = {
  notifyAdmin,
  notifyUser,
  getHistory,
  alertProxyError,
  alertSuspicious
};

