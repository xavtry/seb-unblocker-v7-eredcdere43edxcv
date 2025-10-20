const express = require('express');
const path = require('path');
const fs = require('fs');
const setup = require('./setup');
const proxyMiddleware = require('./proxy/proxyMiddleware');
const logger = require('./proxy/logger');
const errorPage = require('./proxy/errorPage');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup folders/logs
setup.init();

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Main proxy route
app.use('/proxy', proxyMiddleware);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error fallback
app.use((err, req, res, next) => {
  logger.logError(err, req.originalUrl);
  res.status(500).send(errorPage.renderErrorPage(err.message));
});

app.listen(PORT, () => {
  console.log(`Seb-Unblocker-V7 running at http://localhost:${PORT}`);
});
