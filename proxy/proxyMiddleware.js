/**
 * proxyMiddleware.js
 *
 * Main middleware to handle proxying requests in Seb-Unblocker V7
 * Features:
 *  - Integrates fetcher, rewrite, puppeteer, cookies, throttler
 *  - Handles errors gracefully
 *  - Supports caching & logging
 *  - Maintains sessions
 */

const { fetchPage } = require('./fetcher');
const { rewriteHTML } = require('./rewrite');
const { processIframe } = require('./iframeHandler');
const { throttleMiddleware } = require('./throttler');
const { validateRequest } = require('./validator');
const { handleSetCookieHeader, getCookies } = require('./cookies');
const { logger } = require('./logger');
const { renderWithPuppeteer } = require('./puppeteerRender');
const CONFIG = require('./config');

async function proxyHandler(req, res) {
  try {
    // Rate limit
    await throttleMiddleware(req, res, async () => {});

    // Validate
    validateRequest(req, res, () => {});

    const sessionId = req.sessionID || req.ip;

    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL provided');

    const cookies = getCookies(sessionId);

    // Decide if Puppeteer needed
    const usePuppeteer = CONFIG.dynamicSites.some(site => targetUrl.includes(site));

    let html;
    if (usePuppeteer) {
      html = await renderWithPuppeteer(targetUrl, cookies);
    } else {
      html = await fetchPage(targetUrl, cookies);
    }

    // Rewrite links, scripts, CSS, iframes
    html = rewriteHTML(html, targetUrl);
    html = await processIframe(html, targetUrl);

    res.send(html);
  } catch (err) {
    logger.logError('proxyMiddleware error: ' + err.message);
    res.status(500).send('Proxy error');
  }
}

module.exports = {
  proxyHandler
};

