const fetch = require('node-fetch');
const { URL } = require('url');
const logger = require('./logger');

class Fetcher {
  constructor() {
    this.maxRetries = 3;
    this.timeout = 15000;
  }

  async fetchHTML(targetUrl, headers = {}) {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const res = await fetch(targetUrl, {
          headers,
          redirect: 'follow',
          timeout: this.timeout,
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const text = await res.text();
        return text;
      } catch (err) {
        logger.logError(err, targetUrl);
        attempt++;
        if (attempt === this.maxRetries) throw err;
      }
    }
  }

  async fetchResource(url, type = 'text') {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch resource: ${url}`);
      return type === 'buffer' ? await res.buffer() : await res.text();
    } catch (err) {
      logger.logError(err, url);
      throw err;
    }
  }
}

module.exports = new Fetcher();
