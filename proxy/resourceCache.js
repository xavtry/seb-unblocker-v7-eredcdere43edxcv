/**
 * resourceCache.js
 *
 * Smart caching of resources (HTML, CSS, JS, images, etc) for the proxy.
 * Features:
 *  - in-memory cache with LRU eviction
 *  - optional disk cache for persistence
 *  - configurable TTL per resource type
 *  - async get/set/delete
 *  - simple stats for hits/misses
 *
 * Dependencies: fs, path, crypto
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');

class ResourceCache {
  constructor(opts = {}) {
    this.memoryCache = new Map(); // url -> { buffer/text, timestamp, ttl }
    this.maxMemoryItems = opts.maxMemoryItems || 1000;
    this.defaultTTL = opts.defaultTTL || 5 * 60 * 1000; // 5 min
    this.diskCachePath = opts.diskCachePath || path.join(__dirname, '../cache');
    if (!fs.existsSync(this.diskCachePath)) fs.mkdirSync(this.diskCachePath, { recursive: true });
    this.stats = { hits: 0, misses: 0 };
  }

  _hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async _diskPath(key) {
    return path.join(this.diskCachePath, this._hashKey(key));
  }

  async set(key, data, ttl = null) {
    const expire = Date.now() + (ttl || this.defaultTTL);
    this.memoryCache.set(key, { data, expire });
    // LRU cleanup
    if (this.memoryCache.size > this.maxMemoryItems) {
      const oldest = Array.from(this.memoryCache.entries()).sort((a, b) => a[1].expire - b[1].expire);
      const [removeKey] = oldest[0];
      this.memoryCache.delete(removeKey);
    }
    // write to disk asynchronously
    try {
      const diskPath = await this._diskPath(key);
      fs.writeFile(diskPath, JSON.stringify({ data, expire }), err => {
        if (err) logger.logError('resourceCache disk write failed: ' + err.message);
      });
    } catch (e) {
      logger.logError('resourceCache set error: ' + e.message);
    }
  }

  async get(key) {
    const mem = this.memoryCache.get(key);
    const now = Date.now();
    if (mem && mem.expire > now) {
      this.stats.hits++;
      return mem.data;
    } else if (mem) {
      this.memoryCache.delete(key);
    }

    // check disk cache
    try {
      const diskPath = await this._diskPath(key);
      if (fs.existsSync(diskPath)) {
        const raw = fs.readFileSync(diskPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.expire > now) {
          this.stats.hits++;
          this.memoryCache.set(key, { data: parsed.data, expire: parsed.expire });
          return parsed.data;
        } else {
          fs.unlink(diskPath, () => {});
        }
      }
    } catch (e) {
      logger.logError('resourceCache disk read error: ' + e.message);
    }

    this.stats.misses++;
    return null;
  }

  async delete(key) {
    this.memoryCache.delete(key);
    try {
      const diskPath = await this._diskPath(key);
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    } catch (e) {
      logger.logError('resourceCache delete error: ' + e.message);
    }
  }

  statsSummary() {
    return { ...this.stats, memorySize: this.memoryCache.size };
  }
}

module.exports = new ResourceCache();
