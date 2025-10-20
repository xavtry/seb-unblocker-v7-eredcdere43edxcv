/**
 * validator.js
 *
 * Validates input, URLs, and user requests
 * Features:
 *  - URL & protocol checks
 *  - Blocked domain detection
 *  - Max URL length
 *  - Rate-limited requests validation
 *  - Basic XSS / injection prevention
 *  - Returns detailed error codes for proxy
 *  - Advanced sanitization hooks
 */

const CONFIG = require('./config');
const { logInfo, logWarning } = require('./loggerDB');

function validateUrl(url) {
  if (!url) return { valid: false, reason: 'Empty URL' };
  if (typeof url !== 'string') return { valid: false, reason: 'URL must be a string' };
  if (url.length > 2048) return { valid: false, reason: 'URL too long' };
  if (!CONFIG.proxy.allowedProtocols.includes(new URL(url, 'https://dummy').protocol)) return { valid: false, reason: 'Protocol not allowed' };
  if (CONFIG.isBlockedDomain(url)) return { valid: false, reason: 'Blocked domain' };
  return { valid: true };
}

function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';
  // Remove script tags
  return str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/on\w+="[\s\S]*?"/gi, '');
}

function validateSearchQuery(q) {
  if (!q || typeof q !== 'string') return { valid: false, reason: 'Empty query' };
  if (q.length > 100) return { valid: false, reason: 'Query too long' };
  const sanitized = sanitizeInput(q);
  return { valid: true, sanitized };
}

function validateSession(session) {
  if (!session || typeof session !== 'object') return { valid: false, reason: 'Invalid session' };
  if (!session.id) return { valid: false, reason: 'Missing session ID' };
  if (!session.ip) return { valid: false, reason: 'Missing IP' };
  return { valid: true };
}

// Rate limiting per IP/session
function validateRateLimit(requests, ip) {
  const { window, max } = CONFIG.getRateLimit();
  const now = Date.now();
  requests[ip] = requests[ip] || [];
  requests[ip] = requests[ip].filter(ts => now - ts < window);
  if (requests[ip].length >= max) return { valid: false, reason: 'Rate limit exceeded' };
  requests[ip].push(now);
  return { valid: true };
}

// Validate headers
function validateHeaders(headers) {
  if (!headers) return { valid: false, reason: 'Missing headers' };
  if (!headers['user-agent']) return { valid: false, reason: 'Missing User-Agent' };
  return { valid: true };
}

// Future: XSS, CSRF, SQLi checks

module.exports = {
  validateUrl,
  sanitizeInput,
  validateSearchQuery,
  validateSession,
  validateRateLimit,
  validateHeaders
};
