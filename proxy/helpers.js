
/**
 * helpers.js
 *
 * Utility functions shared across proxy modules.
 * Features:
 *  - delay for throttling
 *  - random user-agent generator
 *  - URL validation and normalization
 *  - safe path resolution
 */

const path = require('path');
const { URL } = require('url');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/120.0'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function validateURL(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function safePath(...segments) {
  const full = path.join(...segments);
  if (!full.startsWith(path.resolve(__dirname, '..'))) {
    throw new Error('Unsafe path detected: ' + full);
  }
  return full;
}

module.exports = { delay, randomUserAgent, validateURL, safePath };
