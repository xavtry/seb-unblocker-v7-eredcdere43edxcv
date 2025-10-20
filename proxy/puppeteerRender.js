
const puppeteer = require('puppeteer');
const logger = require('./logger');

class PuppeteerRenderer {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({ headless: true });
    }
  }

  async renderPage(url) {
    await this.init();
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const content = await page.content();
      await page.close();
      return content;
    } catch (err) {
      logger.logError(err, url);
      await page.close();
      throw err;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new PuppeteerRenderer();
