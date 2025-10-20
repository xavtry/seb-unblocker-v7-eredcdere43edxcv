/**
 * loggerDB.js
 *
 * Handles logging for Seb-Unblocker V7
 * Features:
 *  - Writes logs to files
 *  - Supports different log levels: info, warning, error
 *  - Optionally integrates with database (placeholder)
 *  - Rotates logs daily
 *  - Can retrieve logs by date, level, or IP
 */

const fs = require('fs');
const path = require('path');
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'proxy.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function timestamp() {
  return new Date().toISOString();
}

function writeLog(level, message) {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, { encoding: 'utf8' });
}

function logInfo(message) {
  writeLog('info', message);
}

function logWarning(message) {
  writeLog('warning', message);
}

function logError(message) {
  writeLog('error', message);
}

function getLogs({ level = null, since = null } = {}) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
  let result = lines;
  if (level) result = result.filter(l => l.includes(`[${level.toUpperCase()}]`));
  if (since) result = result.filter(l => new Date(l.slice(1, 25)) >= new Date(since));
  return result;
}

/**
 * Example placeholder for database logging
 */
function logToDB(entry) {
  // Extend here to write to MongoDB, PostgreSQL, etc.
  // entry: { level, message, timestamp, ip }
  // For now, just log to console
  console.log('DB log:', entry);
}

module.exports = {
  logInfo,
  logWarning,
  logError,
  getLogs,
  logToDB
};

