
/**
 * sanitize.js
 *
 * Sanitizes HTML/JS content for safe proxy delivery.
 * Features:
 *  - strips <script> tags if needed
 *  - escapes dangerous attributes
 *  - rewrites inline JS safely
 *  - optional aggressive mode
 */
const { logger } = require('./logger');

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

function sanitizeHTML(html, opts = {}) {
  if (!html) return '';
  let sanitized = html;

  // Remove dangerous script tags if aggressive
  if (opts.aggressive) {
    sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  // Remove inline event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, '');

  // Escape any dangerous characters in attributes
  sanitized = sanitized.replace(/<([a-z]+)([^>]*)>/gi, (match, tag, attrs) => {
    let cleanAttrs = attrs.replace(/(href|src)=['"]?javascript:[^'"]*['"]?/gi, '');
    return `<${tag}${cleanAttrs}>`;
  });

  logger.logInfo('sanitizeHTML executed.');
  return sanitized;
}

module.exports = { sanitizeHTML, escapeHtml };
