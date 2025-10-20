/**
 * cssParser.js
 *
 * Advanced CSS parser and rewriter for Seb-Unblocker V7
 * Features:
 *  - Rewrites relative URLs (backgrounds, fonts, imports) to go through proxy
 *  - Supports inline and external CSS
 *  - Caching of parsed CSS
 *  - Optional sanitization
 *  - Handles multiple layers of imports
 */

const { URL } = require('url');
const { logger } = require('./logger');
const { sanitizeURL } = require('./helpers');
const CONFIG = require('./config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cache = new Map();

/**
 * Generate a cache key for CSS content
 */
function generateCacheKey(cssText, targetUrl) {
  const hash = crypto.createHash('sha256');
  hash.update(cssText + targetUrl);
  return hash.digest('hex');
}

/**
 * Rewrite URLs in CSS text
 * Supports: url(), @import
 */
function rewriteCSSUrls(cssText, targetUrl) {
  if (!cssText || !targetUrl) return '';

  let content = cssText;

  // Rewrite url(...) references
  content = content.replace(/url\(([^)]+)\)/gi, (match, urlPath) => {
    try {
      let cleanUrl = urlPath.trim().replace(/['"]/g, '');
      if (!cleanUrl) return match;

      const absoluteUrl = new URL(cleanUrl, targetUrl).href;
      const proxyUrl = `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return `url("${proxyUrl}")`;
    } catch (err) {
      logger.logError('CSS url rewrite error: ' + err.message);
      return match;
    }
  });

  // Rewrite @import statements
  content = content.replace(/@import\s+['"]([^'"]+)['"]/gi, (match, importUrl) => {
    try {
      const absoluteUrl = new URL(importUrl, targetUrl).href;
      return `@import url("/proxy?url=${encodeURIComponent(absoluteUrl)}")`;
    } catch (err) {
      logger.logError('CSS @import rewrite error: ' + err.message);
      return match;
    }
  });

  return content;
}

/**
 * Parse and rewrite CSS content with caching
 */
async function parseCSS(cssText, targetUrl, opts = {}) {
  if (!cssText || !targetUrl) return '';

  const cacheKey = generateCacheKey(cssText, targetUrl);
  if (CONFIG.cache.enabled && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let rewritten = rewriteCSSUrls(cssText, targetUrl);

  // Optional aggressive sanitization
  if (opts.sanitize) {
    rewritten = rewritten.replace(/expression\s*\([^)]*\)/gi, ''); // remove CSS expressions
    rewritten = rewritten.replace(/javascript:/gi, ''); // remove JS in URLs
  }

  if (CONFIG.cache.enabled) {
    cache.set(cacheKey, rewritten);
    // Optional: cleanup old cache entries if size exceeds limit
    if (cache.size > 500) cache.clear();
  }

  return rewritten;
}

/**
 * Load external CSS file and rewrite
 */
async function loadExternalCSS(fileUrl) {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch CSS: ${res.status}`);
    const cssText = await res.text();
    return await parseCSS(cssText, fileUrl);
  } catch (err) {
    logger.logError('loadExternalCSS error: ' + err.message);
    return '';
  }
}

/**
 * Recursively handle @import statements in CSS
 */
async function handleCSSImports(cssText, baseUrl) {
  const importRegex = /@import\s+url\(['"]?([^'")]+)['"]?\)/gi;
  let match;
  let content = cssText;

  while ((match = importRegex.exec(cssText))) {
    const importUrl = new URL(match[1], baseUrl).href;
    const importedCSS = await loadExternalCSS(importUrl);
    content = content.replace(match[0], importedCSS);
  }

  return content;
}

/**
 * Main function to parse CSS for proxy
 */
async function processCSS(cssText, targetUrl, opts = {}) {
  try {
    let parsed = await parseCSS(cssText, targetUrl, opts);
    parsed = await handleCSSImports(parsed, targetUrl);
    return parsed;
  } catch (err) {
    logger.logError('processCSS error: ' + err.message);
    return cssText;
  }
}

module.exports = {
  processCSS,
  rewriteCSSUrls,
  loadExternalCSS,
  handleCSSImports,
  parseCSS
};
