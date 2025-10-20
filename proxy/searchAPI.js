
/**
 * searchAPI.js
 *
 * Advanced top-10 search results handler.
 * Features:
 *  - Query sanitization
 *  - Uses DuckDuckGo HTML scraping by default
 *  - Optional fallback engines
 *  - Rate-limiting per IP
 *  - Returns JSON: title, url, description
 */

const fetch = require('node-fetch');
const { validateURL } = require('./helpers');
const CONFIG = require('./config');
const { logger } = require('./logger');

const rateLimitMap = new Map();

async function search(query, ip) {
  // Rate limit
  const lastAccess = rateLimitMap.get(ip) || 0;
  if (Date.now() - lastAccess < 1000 * 10) { // 10s per request
    throw new Error('Rate limit exceeded');
  }
  rateLimitMap.set(ip, Date.now());

  // Sanitize query
  const safeQuery = query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!safeQuery) throw new Error('Invalid query');

  const results = [];
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(safeQuery)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SebUnblockerBot/1.0' } });
    const html = await res.text();

    // Regex extract (simplified)
    const regex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>.*?<a class="result__snippet">([^<]+)<\/a>/gs;
    let match;
    while ((match = regex.exec(html)) && results.length < CONFIG.search.maxResults) {
      const link = match[1].startsWith('/l/?kh=-1&uddg=') ?
        decodeURIComponent(match[1].split('uddg=')[1]) : match[1];

      if (!validateURL(link)) continue;

      results.push({
        title: match[2],
        url: link,
        description: match[3]
      });
    }
  } catch (err) {
    logger.logError('searchAPI error: ' + err.message);
  }

  return results;
}

module.exports = { search };
