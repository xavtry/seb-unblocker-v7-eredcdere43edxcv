/**
 * helpers.js
 *
 * Collection of utility functions for Seb-Unblocker V7
 * Features:
 *  - URL validation & normalization
 *  - Random string / ID generator
 *  - Delay & sleep functions
 *  - Safe JSON parsing
 *  - Proxy URL building
 *  - Cookie parsing helpers
 *  - Array / object helpers
 *  - Retry wrappers
 */

const crypto = require('crypto');
const CONFIG = require('./config');

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return CONFIG.proxy.allowedProtocols.includes(u.protocol);
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

function generateRandomString(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonParse(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function buildProxyUrl(targetUrl) {
  return `/proxy?url=${encodeURIComponent(targetUrl)}`;
}

function parseCookies(cookieHeader) {
  const obj = {};
  if (!cookieHeader) return obj;
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.split('=');
    if (k && v) obj[k.trim()] = v.trim();
  });
  return obj;
}

function flattenArray(arr) {
  return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flattenArray(val) : val), []);
}

function retryWrapper(fn, attempts = 3, delay = 500) {
  return async function (...args) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(...args); } catch (err) { lastError = err; await sleep(delay); }
    }
    throw lastError;
  };
}

function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

// Advanced logging utility
function logActivity(type, message, extra = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`, extra);
}

function safeEval(fn) {
  try { return fn(); } catch { return null; }
}

// Future: expand helpers for DOM manipulation, HTML sanitization, caching

module.exports = {
  isValidUrl,
  normalizeUrl,
  generateRandomString,
  sleep,
  safeJsonParse,
  buildProxyUrl,
  parseCookies,
  flattenArray,
  retryWrapper,
  uniqueBy,
  logActivity,
  safeEval
};
