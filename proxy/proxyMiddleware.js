/**
 * proxyMiddleware.js
 * Handles core middleware for proxy requests, including logging, throttling, headers, and error handling
 */

const { validateUrl } = require('./validator');
const { throttleRequest } = require('./throttler');
const { logRequest } = require('./logger');
const { sanitizeHeaders } = require('./sanitize');

module.exports = async function proxyMiddleware(req, res, next) {
    try {
        // Step 1: Validate URL query
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).send('No URL specified');
        if (!validateUrl(targetUrl)) return res.status(400).send('Invalid URL');

        // Step 2: Throttle excessive requests
        const throttleResult = throttleRequest(req.ip, targetUrl);
        if (!throttleResult.allowed) {
            return res.status(429).send('Too many requests. Try again later.');
        }

        // Step 3: Sanitize headers
        req.headers = sanitizeHeaders(req.headers);

        // Step 4: Log request
        logRequest(req.ip, targetUrl, req.headers);

        // Step 5: Proxy meta-data injection
        req.proxyMeta = {
            startedAt: Date.now(),
            clientIp: req.ip,
            userAgent: req.headers['user-agent'] || '',
        };

        // Step 6: Continue to next middleware or fetch
        next();
    } catch (err) {
        console.error('Proxy middleware error:', err);
        res.status(500).send('Internal proxy error');
    }
};

// Additional helper functions (future hooks)
function addSecurityHeaders(res) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
}

// We can expand this file to include caching middleware, cookie handling, and more
