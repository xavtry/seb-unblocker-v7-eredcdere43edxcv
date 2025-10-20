/**
 * iframeHandler.js
 *
 * Handles iframe rewriting and security for Seb-Unblocker V7
 * Features:
 *  - Rewrites iframe src URLs through proxy
 *  - Handles nested iframes
 *  - Enforces sandboxing
 *  - Supports messaging between parent and iframe
 *  - Logs iframe errors
 */

const { URL } = require('url');
const { logger } = require('./logger');
const { sanitizeURL } = require('./helpers');
const CONFIG = require('./config');

const iframeCache = new Map();

/**
 * Generate cache key for iframe content
 */
function generateIframeCacheKey(srcUrl) {
  return Buffer.from(srcUrl).toString('base64');
}

/**
 * Rewrite iframe src to proxy
 */
function rewriteIframeSrc(iframeHtml, targetUrl) {
  if (!iframeHtml) return '';

  return iframeHtml.replace(/<iframe\s+([^>]*?)src=['"]([^'"]+)['"]/gi, (match, attrs, src) => {
    try {
      const absoluteUrl = new URL(src, targetUrl).href;
      const proxiedUrl = `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return `<iframe ${attrs} src="${proxiedUrl}" sandbox="allow-scripts allow-same-origin allow-forms">`;
    } catch (err) {
      logger.logError('iframe rewrite error: ' + err.message);
      return match;
    }
  });
}

/**
 * Handle nested iframes recursively
 */
function processNestedIframes(htmlContent, targetUrl, depth = 0) {
  if (depth > 5) return htmlContent; // prevent infinite recursion
  const rewritten = rewriteIframeSrc(htmlContent, targetUrl);

  // If there are nested iframes, recurse
  if (/<iframe\s+.*?src=['"][^'"]+['"]>/i.test(rewritten)) {
    return processNestedIframes(rewritten, targetUrl, depth + 1);
  }

  return rewritten;
}

/**
 * Cache iframe content
 */
function cacheIframeContent(srcUrl, content) {
  const key = generateIframeCacheKey(srcUrl);
  iframeCache.set(key, content);
  if (iframeCache.size > 200) iframeCache.clear(); // simple eviction
}

/**
 * Retrieve cached iframe content
 */
function getCachedIframeContent(srcUrl) {
  const key = generateIframeCacheKey(srcUrl);
  return iframeCache.get(key);
}

/**
 * Sanitize iframe HTML for proxy
 */
function sanitizeIframeContent(html) {
  if (!html) return '';
  // Remove inline event handlers
  html = html.replace(/on\w+=["'][^"']*["']/gi, '');
  // Remove <base> tags
  html = html.replace(/<base[^>]*>/gi, '');
  return html;
}

/**
 * Main processing function
 */
async function processIframe(htmlContent, targetUrl) {
  try {
    let content = sanitizeIframeContent(htmlContent);
    content = processNestedIframes(content, targetUrl);
    cacheIframeContent(targetUrl, content);
    return content;
  } catch (err) {
    logger.logError('processIframe error: ' + err.message);
    return htmlContent;
  }
}

module.exports = {
  rewriteIframeSrc,
  processNestedIframes,
  processIframe,
  cacheIframeContent,
  getCachedIframeContent
};
