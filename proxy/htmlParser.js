
/**
 * htmlParser.js
 *
 * Advanced HTML parser & rewriter.
 * Features:
 *  - Rewrite all relative URLs to proxy
 *  - Remove <base> tags
 *  - Rewrite inline JS/CSS paths
 *  - Handles iframe injections
 *  - Supports optional aggressive sanitization
 */

const { URL } = require('url');
const { sanitizeHTML } = require('./sanitize');
const CONFIG = require('./config');

function parseAndRewriteHTML(html, targetUrl, opts = {}) {
  if (!html || !targetUrl) return '';

  let content = html;

  // Remove <base> if configured
  if (CONFIG.proxy.removeBaseTag) {
    content = content.replace(/<base[^>]*>/gi, '');
  }

  // Rewrite href/src
  content = content.replace(/(href|src)=['"]([^'"]+)['"]/gi, (match, attr, link) => {
    try {
      const absoluteUrl = new URL(link, targetUrl).href;
      return `${attr}="/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
    } catch {
      return match;
    }
  });

  // Inline JS/CSS rewrite for src/href inside <style> or <script>
  content = content.replace(/url\(([^)]+)\)/gi, (match, urlPath) => {
    try {
      const cleanUrl = urlPath.replace(/['"]/g, '');
      const absoluteUrl = new URL(cleanUrl, targetUrl).href;
      return `url("/proxy?url=${encodeURIComponent(absoluteUrl)}")`;
    } catch {
      return match;
    }
  });

  // Optional aggressive sanitization
  if (CONFIG.proxy.sanitizeHTML || opts.sanitize) {
    content = sanitizeHTML(content, { aggressive: true });
  }

  return content;
}

module.exports = { parseAndRewriteHTML };
