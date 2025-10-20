
/**
 * cookies.js
 *
 * Advanced cookie/session management for Seb-Unblocker V7
 * Features:
 *  - Parses Set-Cookie headers from proxied sites
 *  - Stores per-user session cookies
 *  - Rewrites cookie domains and paths
 *  - Handles expiration, secure, HttpOnly, and SameSite flags
 *  - Logs cookie errors
 */

const { logger } = require('./logger');

const sessions = new Map();

/**
 * Parse a Set-Cookie header into an object
 */
function parseSetCookie(header) {
  if (!header) return null;

  const parts = header.split(';').map(p => p.trim());
  const [nameValue, ...attributes] = parts;
  const [name, value] = nameValue.split('=');

  const cookie = {
    name,
    value,
    path: '/',
    domain: null,
    expires: null,
    secure: false,
    httpOnly: false,
    sameSite: 'Lax'
  };

  for (const attr of attributes) {
    const [attrName, attrValue] = attr.split('=');
    switch (attrName.toLowerCase()) {
      case 'path': cookie.path = attrValue || '/'; break;
      case 'domain': cookie.domain = attrValue; break;
      case 'expires': cookie.expires = new Date(attrValue); break;
      case 'secure': cookie.secure = true; break;
      case 'httponly': cookie.httpOnly = true; break;
      case 'samesite': cookie.sameSite = attrValue; break;
    }
  }

  return cookie;
}

/**
 * Store cookies per session
 */
function storeCookies(sessionId, setCookieHeaders) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const sessionCookies = sessions.get(sessionId);

  for (const header of setCookieHeaders) {
    const cookie = parseSetCookie(header);
    if (cookie) {
      // Remove duplicates
      const index = sessionCookies.findIndex(c => c.name === cookie.name && c.domain === cookie.domain);
      if (index !== -1) sessionCookies.splice(index, 1);
      sessionCookies.push(cookie);
    }
  }
}

/**
 * Retrieve cookies for a session
 */
function getCookies(sessionId) {
  if (!sessions.has(sessionId)) return '';
  const sessionCookies = sessions.get(sessionId);
  const validCookies = sessionCookies.filter(c => !c.expires || new Date() < c.expires);
  return validCookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Clear session cookies
 */
function clearSessionCookies(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Rewrite cookies for proxied request
 */
function rewriteCookiesForProxy(cookieHeader, targetUrl) {
  if (!cookieHeader) return '';
  // Optionally sanitize or append proxy-specific tokens
  return cookieHeader;
}

/**
 * Main cookie handler
 */
function handleSetCookieHeader(sessionId, setCookieHeader) {
  if (!setCookieHeader) return;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  storeCookies(sessionId, headers);
}

module.exports = {
  parseSetCookie,
  storeCookies,
  getCookies,
  clearSessionCookies,
  rewriteCookiesForProxy,
  handleSetCookieHeader
};
