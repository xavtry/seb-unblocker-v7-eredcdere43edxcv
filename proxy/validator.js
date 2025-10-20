/**
 * validator.js
 *
 * Validates URLs, content, and requests for Seb-Unblocker V7
 * Features:
 *  - URL validation and normalization
 *  - Blocklist/allowlist checks
 *  - Prevents XSS & SSRF attempts
 *  - Logs invalid requests
 *  - Can be extended for content type validation
 */

const { URL } = require('url');
const { logger } = require('./logger');

const BLOCKLIST = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0'
];

const ALLOW_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate and normalize URL
 */
function validateURL(input) {
  try {
    if (!input) return null;

    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const parsed = new URL(url);

    // Block local addresses
    if (BLOCKLIST.includes(parsed.hostname)) {
      logger.logWarning(`Blocked URL attempt: ${url}`);
      return null;
    }

    if (!ALLOW_PROTOCOLS.includes(parsed.protocol)) {
      logger.logWarning(`Invalid protocol: ${url}`);
      return null;
    }

    return parsed.href;
  } catch (err) {
    logger.logError(`validateURL error: ${err.message}`);
    return null;
  }
}

/**
 * Validate HTML content
 */
function validateHTML(html) {
  if (!html || typeof html !== 'string') return false;

  // Simple XSS prevention
  const blacklist = ['<script>', 'onerror=', 'onload='];
  for (const b of blacklist) {
    if (html.toLowerCase().includes(b)) return false;
  }
  return true;
}

/**
 * Check allowed MIME type
 */
function validateMime(mime) {
  const allowed = ['text/html', 'application/javascript', 'text/css', 'image/png', 'image/jpeg', 'image/gif'];
  return allowed.includes(mime);
}

/**
 * Middleware for Express
 */
function validateRequest(req, res, next) {
  const url = req.query.url || req.body.url;
  const valid = validateURL(url);

  if (!valid) {
    return res.status(400).send('Invalid URL');
  }

  next();
}

module.exports = {
  validateURL,
  validateHTML,
  validateMime,
  validateRequest
};

