

/**
 * config.js
 *
 * Full proxy configuration.
 * Includes environment variables, caching, Puppeteer options, throttling, logging paths, and security toggles.
 */

const path = require('path');
const os = require('os');

const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    hostname: process.env.HOSTNAME || '0.0.0.0',
    useHTTPS: process.env.USE_HTTPS === 'true' || false
  },
  proxy: {
    allowExternal: process.env.ALLOW_EXTERNAL !== 'false',
    maxRedirects: parseInt(process.env.MAX_REDIRECTS) || 5,
    timeout: parseInt(process.env.PROXY_TIMEOUT) || 15000,
    puppeteer: {
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    },
    rewriteRelativeLinks: true,
    sanitizeHTML: true,
    removeBaseTag: true
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    maxSizeMB: parseInt(process.env.CACHE_MAX_SIZE_MB) || 512,
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES) || 60,
    directory: path.join(__dirname, '..', 'cache')
  },
  logs: {
    directory: path.join(__dirname, '..', 'logs'),
    proxyLog: path.join(__dirname, '..', 'logs', 'proxy.log'),
    dbLog: path.join(__dirname, '..', 'logs', 'proxyDB.log')
  },
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 60
    },
    enforceCSP: process.env.ENFORCE_CSP !== 'false',
    enableXSSProtection: true
  },
  search: {
    defaultEngine: 'duckduckgo',
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS) || 10,
    rateLimitPerIP: 5
  }
};

module.exports = CONFIG;
