/**
 * config.js
 * 
 * Central configuration for Seb-Unblocker V7
 * Features:
 *  - Proxy limits
 *  - Allowed/blocked domains
 *  - Rate limiting
 *  - Puppeteer options
 *  - Logging levels
 *  - Search API keys & settings
 *  - Session & cookie defaults
 */

const path = require('path');

const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    staticDir: path.join(__dirname, '../public'),
    viewsDir: path.join(__dirname, '../views')
  },

  proxy: {
    maxConnectionsPerIP: 5,
    timeout: 15000, // 15 seconds
    allowedProtocols: ['http:', 'https:'],
    blockedDomains: [
      'malware.com',
      'phishing.net',
      'evil.site'
    ],
    enableCaching: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    userAgent: 'Seb-Unblocker-V7/1.0'
  },

  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 20000
  },

  search: {
    api: 'duckduckgo', // future-proof for other APIs
    maxResults: 10,
    retryOnFail: 2,
    timeout: 8000
  },

  logging: {
    level: 'info', // info, warning, error
    logDir: path.join(__dirname, '../logs'),
    enableWSLogs: true,
    logToDB: false
  },

  security: {
    enableCSP: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self'; frame-src *",
    rateLimitWindow: 60 * 1000,
    maxRequestsPerWindow: 20
  },

  notifications: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@seb-unblocker.com',
    enableThrottle: true,
    throttleWindow: 60000,
    throttleLimit: 5
  }
};

// Utility functions for configs
CONFIG.isBlockedDomain = (url) => {
  try {
    const hostname = new URL(url).hostname;
    return CONFIG.proxy.blockedDomains.includes(hostname);
  } catch {
    return false;
  }
};

CONFIG.isProtocolAllowed = (url) => {
  try {
    const protocol = new URL(url).protocol;
    return CONFIG.proxy.allowedProtocols.includes(protocol);
  } catch {
    return false;
  }
};

CONFIG.getCacheKey = (url) => encodeURIComponent(url);

CONFIG.getPuppeteerOptions = () => CONFIG.puppeteer;

CONFIG.getSearchMaxResults = () => CONFIG.search.maxResults;

CONFIG.getLogLevel = () => CONFIG.logging.level;

CONFIG.getRateLimit = () => ({
  window: CONFIG.security.rateLimitWindow,
  max: CONFIG.security.maxRequestsPerWindow
});

CONFIG.getAdminEmail = () => CONFIG.notifications.adminEmail;

CONFIG.getThrottleSettings = () => ({
  window: CONFIG.notifications.throttleWindow,
  limit: CONFIG.notifications.throttleLimit
});

// Future extension: dynamic config reload from file or DB
CONFIG.reload = () => {
  console.log('Reloading config (stub) ...');
};

module.exports = CONFIG;
