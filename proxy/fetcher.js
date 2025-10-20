/**
 * fetcher.js
 *
 * Robust HTTP fetch helper used by the proxy:
 * - retries with exponential backoff
 * - request timeouts
 * - optional cookie forwarding from incoming client request
 * - returns text or buffer depending on content-type
 * - exposes helpers for HEAD/GET and streaming
 *
 * Dependencies: node-fetch@2, zlib (built-in)
 */

const fetch = require('node-fetch');
const zlib = require('zlib');
const { URL } = require('url');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);
const { logger } = require('./logger');
const DEFAULT_USER_AGENT = 'Seb-Unblocker-V7/1.0 (+https://example.invalid)';

class Fetcher {
  constructor(opts = {}) {
    this.maxRetries = opts.maxRetries || 3;
    this.baseTimeout = opts.baseTimeout || 15000; // ms
    this.userAgent = opts.userAgent || DEFAULT_USER_AGENT;
    this.followRedirects = opts.followRedirects !== undefined ? opts.followRedirects : 'follow';
  }

  _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  /**
   * Create default headers for fetches.
   * If incomingReq provided, and attachCookies true, transfers Cookie header.
   */
  _makeHeaders(incomingReq, extra = {}, attachCookies = false) {
    const h = Object.assign({
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip,deflate,br'
    }, extra);

    if (attachCookies && incomingReq && incomingReq.headers && incomingReq.headers.cookie) {
      h['Cookie'] = incomingReq.headers.cookie;
    }
    return h;
  }

  /**
   * Fetch text/html (returns { ok, status, headers, text })
   * - url: string
   * - options: { timeout, incomingReq, attachCookies, headers }
   */
  async fetchText(url, options = {}) {
    return await this._fetchWithRetries(url, { ...options, responseType: 'text' });
  }

  /**
   * Fetch raw buffer (images, binaries)
   * returns { ok, status, headers, buffer }
   */
  async fetchBuffer(url, options = {}) {
    return await this._fetchWithRetries(url, { ...options, responseType: 'buffer' });
  }

  /**
   * Internal shared fetch with retries.
   */
  async _fetchWithRetries(url, opts = {}) {
    let attempt = 0;
    const maxAttempts = Math.max(1, this.maxRetries);
    const timeout = opts.timeout || this.baseTimeout;
    const incomingReq = opts.incomingReq || null;
    const attachCookies = !!opts.attachCookies;
    const extraHeaders = opts.headers || {};

    for (; attempt < maxAttempts; attempt++) {
      try {
        const controller = new fetch.AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, {
          method: 'GET',
          redirect: this.followRedirects,
          signal: controller.signal,
          headers: this._makeHeaders(incomingReq, extraHeaders, attachCookies),
        });

        clearTimeout(id);

        const contentType = res.headers.get('content-type') || '';
        const encoding = (res.headers.get('content-encoding') || '').toLowerCase();

        // Non-success status codes still return body (we pass through).
        if (opts.responseType === 'buffer') {
          // stream to buffer
          const chunks = [];
          await new Promise((resolve, reject) => {
            res.body.on('data', c => chunks.push(c));
            res.body.on('end', resolve);
            res.body.on('error', reject);
          });
          const buffer = Buffer.concat(chunks);
          return { ok: res.ok, status: res.status, headers: res.headers.raw(), buffer, contentType };
        } else {
          // text path: handle gzip/deflate/br when node-fetch doesn't auto-decompress
          let text;
          // node-fetch v2 usually auto-decompresses; still handle br edge-case using pipeline if needed
          if (encoding === 'br') {
            // handle Brotli
            const decompressed = zlib.brotliDecompressSync(await res.buffer());
            text = decompressed.toString('utf8');
          } else {
            text = await res.text();
          }
          return { ok: res.ok, status: res.status, headers: res.headers.raw(), text, contentType };
        }
      } catch (err) {
        logger.logError(`fetcher: attempt ${attempt + 1} failed for ${url} - ${err.message}`);
        // if abort, treat as retryable
        if (attempt + 1 >= maxAttempts) {
          throw err;
        }
        // jittered backoff
        const backoff = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await this._sleep(backoff);
      }
    }
    throw new Error('fetcher: unreachable code (retries exhausted)');
  }

  /**
   * HEAD request helper - returns headers (without body)
   */
  async head(url, opts = {}) {
    const timeout = opts.timeout || this.baseTimeout;
    const incomingReq = opts.incomingReq || null;
    const controller = new fetch.AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: this.followRedirects, signal: controller.signal, headers: this._makeHeaders(incomingReq) });
      clearTimeout(id);
      return { ok: res.ok, status: res.status, headers: res.headers.raw() };
    } catch (err) {
      clearTimeout(id);
      logger.logError('fetcher.head error for ' + url + ' - ' + err.message);
      throw err;
    }
  }

  /**
   * Stream a remote resource into a Node res (Express res)
   * with basic backpressure handling.
   */
  async streamToResponse(url, expressRes, opts = {}) {
    try {
      const controller = new fetch.AbortController();
      const id = setTimeout(() => controller.abort(), opts.timeout || this.baseTimeout);

      const response = await fetch(url, { signal: controller.signal, redirect: this.followRedirects, headers: this._makeHeaders(opts.incomingReq) });

      clearTimeout(id);
      // Set headers on express res
      const contentType = response.headers.get('content-type');
      if (contentType) expressRes.setHeader('Content-Type', contentType);
      const contentLength = response.headers.get('content-length');
      if (contentLength) expressRes.setHeader('Content-Length', contentLength);

      // forward relevant headers (cache-control, last-modified, etag)
      ['cache-control', 'last-modified', 'etag', 'content-range', 'accept-ranges'].forEach(h => {
        const v = response.headers.get(h);
        if (v) expressRes.setHeader(h, v);
      });

      // pipe
      await pipeline(response.body, expressRes);
    } catch (err) {
      logger.logError('fetcher.streamToResponse error: ' + err.message);
      throw err;
    }
  }
}

module.exports = new Fetcher();
