
/**
 * logger.js
 *
 * Logging helper:
 * - supports info, warn, error
 * - writes to console and rotating file log
 * - timestamps every entry
 * - async queue to avoid blocking main thread
 * - optional log-level filtering
 *
 * Dependencies: fs, path
 */
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(opts = {}) {
    this.logDir = opts.logDir || path.join(__dirname, '../logs');
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    this.logFile = path.join(this.logDir, 'proxy.log');
    this.maxFileSize = opts.maxFileSize || 5 * 1024 * 1024; // 5MB
    this.queue = [];
    this.isWriting = false;
    this.levels = { error: 0, warn: 1, info: 2 };
    this.minLevel = opts.minLevel || 'info';
  }

  _rotateIfNeeded() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          const newName = this.logFile.replace('.log', '-' + Date.now() + '.log');
          fs.renameSync(this.logFile, newName);
        }
      }
    } catch (e) { /* ignore rotation errors */ }
  }

  _writeQueue() {
    if (this.isWriting || this.queue.length === 0) return;
    this.isWriting = true;
    const entry = this.queue.shift();
    fs.appendFile(this.logFile, entry + '\n', err => {
      if (err) console.error('Logger write failed:', err);
      this.isWriting = false;
      setImmediate(() => this._writeQueue());
    });
  }

  _log(level, msg) {
    if (this.levels[level] > this.levels[this.minLevel]) return;
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level.toUpperCase()}] ${msg}`;
    console.log(entry);
    this.queue.push(entry);
    this._writeQueue();
  }

  logInfo(msg) { this._log('info', msg); }
  logWarn(msg) { this._log('warn', msg); }
  logError(msg) { this._log('error', msg); }
}

module.exports = { logger: new Logger() };
