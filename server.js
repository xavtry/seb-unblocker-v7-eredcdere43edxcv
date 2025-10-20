/**
 * seb-unblocker-v7 - Main Express Server
 * Pro-level proxy server with logging, caching, Puppeteer rendering, and advanced middleware
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { logRequest, logError } = require('./proxy/logger');
const { proxyMiddleware } = require('./proxy/proxyMiddleware');
const { puppeteerRender } = require('./proxy/puppeteerRender');
const { sanitizeURL } = require('./proxy/sanitize');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- SECURITY --------------------
app.use(helmet());
app.use(cookieParser());
app.disable('x-powered-by');

// -------------------- RATE LIMIT --------------------
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// -------------------- LOGGING --------------------
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, 'logs', 'proxy.log'), { flags: 'a' })
}));
app.use(logRequest);

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROOT ROUTE --------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- PROXY ROUTE --------------------
app.get('/proxy', async (req, res) => {
  try {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL specified');
    
    targetUrl = sanitizeURL(targetUrl); // sanitize user input

    // Decide rendering method based on config or heuristics
    const usePuppeteer = targetUrl.includes('dynamic') || req.query.p === '1';
    if (usePuppeteer) {
      const html = await puppeteerRender(targetUrl);
      return res.send(html);
    }

    // Standard proxy
    proxyMiddleware(targetUrl, req, res);
  } catch (err) {
    logError(err);
    res.status(500).sendFile(path.join(__dirname, 'views', 'error.html'));
  }
});

// -------------------- SEARCH ROUTE --------------------
const { searchQuery } = require('./proxy/searchAPI');
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });
  try {
    const results = await searchQuery(query);
    res.json(results);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// -------------------- ERROR HANDLER --------------------
app.use((err, req, res, next) => {
  logError(err);
  res.status(500).sendFile(path.join(__dirname, 'views', 'error.html'));
});

// -------------------- WEBSOCKET SUPPORT --------------------
const http = require('http').createServer(app);
const { websocketHandler } = require('./proxy/websocketHandler');
websocketHandler(http);

http.listen(PORT, () => {
  console.log(`Seb's Unblocker V7 running at http://localhost:${PORT}`);
});
