/**
 * security.js
 *
 * Implements security features for the proxy server
 * Features:
 *  - CSP headers
 *  - XSS prevention headers
 *  - Rate-limiting per IP
 *  - Optional HTTPS enforcement
 */

const rateLimit = require('express-rate-limit');

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:;");
}

function createRateLimiter(opts = {}) {
  return rateLimit({
    windowMs: opts.windowMs || 60 * 1000, // 1 minute
    max: opts.max || 60,                  // limit per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  });
}

function enforceHTTPS(req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
}

module.exports = { applySecurityHeaders, createRateLimiter, enforceHTTPS };

