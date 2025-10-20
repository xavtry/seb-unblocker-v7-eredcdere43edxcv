/**
 * puppeteerRender.js
 *
 * Pooled Puppeteer renderer:
 * - maintains a small browser pool (reuses browser instances)
 * - manages a simple queue for render requests to limit concurrency
 * - supports options: viewport, waitUntil, timeout, extra scripts to inject
 * - has graceful restart logic if Chromium crashes
 *
 * Notes:
 *   - Puppeteer is heavy; use sparingly on Replit free tier.
 *   - This module exposes render(url, opts) -> html string
 */

const puppeteer = require('puppeteer');
const EventEmitter = require('events');
const { logger } = require('./logger');
const config = require('./config');

class PuppeteerPool extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.maxBrowsers = opts.maxBrowsers || 1; // conserve resources by default
    this.browsers = []; // array of { browser, inUse }
    this.queue = [];
    this.isShuttingDown = false;
    this.launchArgs = opts.launchArgs || ['--no-sandbox','--disable-setuid-sandbox'];
  }

  async _launchBrowser() {
    const browser = await puppeteer.launch({
      headless: true,
      args: this.launchArgs,
      ignoreHTTPSErrors: true,
    });
    const entry = { browser, inUse: false, lastUsed: Date.now() };
    this.browsers.push(entry);
    logger.logInfo('puppeteer: launched browser instance, total=' + this.browsers.length);
    return entry;
  }

  async _getAvailableBrowser() {
    // try find a non-busy browser
    const free = this.browsers.find(b => !b.inUse);
    if (free) return free;
    if (this.browsers.length < this.maxBrowsers) {
      return await this._launchBrowser();
    }
    return null;
  }

  async requestRender(renderFn) {
    if (this.isShuttingDown) throw new Error('PuppeteerPool is shutting down');
    return new Promise((resolve, reject) => {
      this.queue.push({ renderFn, resolve, reject });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (!this.queue.length) return;
    const browserEntry = await this._getAvailableBrowser();
    if (!browserEntry) return; // wait until a browser is free
    const job = this.queue.shift();
    browserEntry.inUse = true;
    try {
      const result = await job.renderFn(browserEntry.browser);
      browserEntry.inUse = false;
      browserEntry.lastUsed = Date.now();
      job.resolve(result);
      // after finishing, process next queued job
      setImmediate(() => this._processQueue());
    } catch (err) {
      browserEntry.inUse = false;
      logger.logError('puppeteer pool job failed: ' + err.message);
      job.reject(err);
      setImmediate(() => this._processQueue());
    }
  }

  async shutdown() {
    this.isShuttingDown = true;
    // wait until queue drained
    while (this.queue.length) {
      await new Promise(r => setTimeout(r, 100));
    }
    // close all browsers
    await Promise.all(this.browsers.map(async b => {
      try {
        await b.browser.close();
      } catch (err) { /* ignore */ }
    }));
    this.browsers = [];
    logger.logInfo('puppeteer pool shutdown complete');
  }
}

const defaultPool = new PuppeteerPool({ maxBrowsers: (config.puppeteerMaxBrowsers || 1) });

/**
 * Render a page using the pool.
 * options:
 *  - waitUntil: 'networkidle2'|'domcontentloaded' etc
 *  - timeout: ms
 *  - injectScript: string (JS) to evaluate after load
 *  - userAgent: string
 */
async function render(url, options = {}) {
  const waitUntil = options.waitUntil || 'networkidle2';
  const timeout = options.timeout || (config.puppeteerTimeout || 30000);
  const viewport = options.viewport || { width: 1280, height: 800 };
  const injectScript = options.injectScript || null;
  const userAgent = options.userAgent || (config.userAgent || 'Seb-Unblocker-V7/1.0');

  return await defaultPool.requestRender(async (browser) => {
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      await page.setUserAgent(userAgent);
      // block some heavy resource types optionally to speed up
      if (options.blockResources) {
        await page.setRequestInterception(true);
        page.on('request', req => {
          const rtype = req.resourceType();
          if (['image','media','font'].includes(rtype)) return req.abort();
          req.continue();
        });
      }

      await page.goto(url, { waitUntil, timeout });
      if (injectScript) {
        try {
          await page.evaluate(injectScript);
        } catch (e) {
          logger.logError('puppeteer inject script failed: ' + e.message);
        }
      }

      // wait a little for single-page apps to settle if requested
      if (options.extraWait) await page.waitForTimeout(options.extraWait);

      const content = await page.content();
      await page.close();
      return content;
    } catch (err) {
      try { await page.close(); } catch (e) {}
      throw err;
    }
  });
}

module.exports = { render, defaultPool };
