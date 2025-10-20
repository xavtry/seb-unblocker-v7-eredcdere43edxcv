
/**
 * jsParser.js
 *
 * Advanced JavaScript parser and rewriter for Seb-Unblocker V7
 * Features:
 *  - Rewrites fetch, XMLHttpRequest, and dynamically loaded scripts to go through proxy
 *  - Handles inline and external JS files
 *  - Caches rewritten JS
 *  - Sanitizes URLs and scripts
 *  - Logs errors
 */

const { URL } = require('url');
const { logger } = require('./logger');
const { sanitizeURL } = require('./helpers');
const CONFIG = require('./config');
const crypto = require('crypto');

const cache = new Map();

/**
 * Generate a cache key for JS content
 */
function generateCacheKey(jsText, targetUrl) {
  const hash = crypto.createHash('sha256');
  hash.update(jsText + targetUrl);
  return hash.digest('hex');
}

/**
 * Rewrite URLs inside JS code
 *  - fetch()
 *  - XMLHttpRequest
 *  - dynamic script src
 */
function rewriteJSUrls(jsText, targetUrl) {
  if (!jsText || !targetUrl) return '';

  let content = jsText;

  // Rewrite fetch calls
  content = content.replace(/fetch\s*\(\s*['"]([^'"]+)['"]/gi, (match, urlPath) => {
    try {
      const absoluteUrl = new URL(urlPath, targetUrl).href;
      const proxyUrl = `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return match.replace(urlPath, proxyUrl);
    } catch (err) {
      logger.logError('JS fetch rewrite error: ' + err.message);
      return match;
    }
  });

  // Rewrite XMLHttpRequest open calls
  content = content.replace(/open\s*\(\s*['"]GET['"]\s*,\s*['"]([^'"]+)['"]/gi, (match, urlPath) => {
    try {
      const absoluteUrl = new URL(urlPath, targetUrl).href;
      const proxyUrl = `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      return match.replace(urlPath, proxyUrl);
    } catch (err) {
      logger.logError('JS XHR rewrite error: ' + err.message);
      return match;
    }
  });

  // Rewrite dynamically created scripts
  content = content.replace(/createElement\s*\(\s*['"]script['"]\s*\)\s*;/gi, match => {
    return `
      (function(){
        var s=document.createElement('script');
        var origSetAttribute=s.setAttribute;
        s.setAttribute=function(name,value){
          if(name==='src'){
            try{
              value='/proxy?url='+encodeURIComponent(new URL(value,'${targetUrl}').href);
            }catch(e){logger.logError('Dynamic script src rewrite failed: '+e.message);}
          }
          return origSetAttribute.call(this,name,value);
        };
      })();
    `;
  });

  return content;
}

/**
 * Parse and rewrite JS content with caching
 */
async function parseJS(jsText, targetUrl, opts = {}) {
  if (!jsText || !targetUrl) return '';

  const cacheKey = generateCacheKey(jsText, targetUrl);
  if (CONFIG.cache.enabled && cache.has(cacheKey)) return cache.get(cacheKey);

  let rewritten = rewriteJSUrls(jsText, targetUrl);

  // Optional sanitization
  if (opts.sanitize) {
    // Remove eval() calls
    rewritten = rewritten.replace(/eval\s*\(/gi, '');
    // Remove document.write with JS URLs
    rewritten = rewritten.replace(/document\.write\s*\(\s*['"]<script[^>]+><\/script>['"]\)/gi, '');
  }

  if (CONFIG.cache.enabled) {
    cache.set(cacheKey, rewritten);
    if (cache.size > 500) cache.clear(); // simple cache eviction
  }

  return rewritten;
}

/**
 * Load external JS file and rewrite
 */
async function loadExternalJS(fileUrl) {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch JS: ${res.status}`);
    const jsText = await res.text();
    return await parseJS(jsText, fileUrl);
  } catch (err) {
    logger.logError('loadExternalJS error: ' + err.message);
    return '';
  }
}

/**
 * Process inline and external JS for proxy
 */
async function processJS(jsText, targetUrl, opts = {}) {
  try {
    let processed = await parseJS(jsText, targetUrl, opts);

    // Optionally handle dynamic imports (import('url'))
    processed = processed.replace(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/gi, (match, urlPath) => {
      try {
        const absoluteUrl = new URL(urlPath, targetUrl).href;
        return `import('/proxy?url=${encodeURIComponent(absoluteUrl)}')`;
      } catch (e) {
        logger.logError('Dynamic import rewrite error: ' + e.message);
        return match;
      }
    });

    return processed;
  } catch (err) {
    logger.logError('processJS error: ' + err.message);
    return jsText;
  }
}

module.exports = {
  rewriteJSUrls,
  parseJS,
  loadExternalJS,
  processJS
};
