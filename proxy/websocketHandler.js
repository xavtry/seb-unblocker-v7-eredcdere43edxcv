/**
 * websocketHandler.js
 *
 * Handles WebSocket connections for real-time features in Seb-Unblocker V7
 * Features:
 *  - Real-time logging of proxy activity
 *  - Live notifications to clients
 *  - Session-specific updates
 *  - Heartbeat & reconnect support
 *  - Tracks active connections per IP
 */

const WebSocket = require('ws');
const { logger } = require('./logger');

const activeConnections = new Map(); // sessionId -> ws

function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    const sessionId = ip + '-' + Date.now(); // simplistic session tracking
    activeConnections.set(sessionId, ws);

    logger.logInfo(`WebSocket connected: ${sessionId} (${ip})`);

    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Seb-Unblocker WS' }));

    ws.on('message', message => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, sessionId, data);
      } catch (err) {
        logger.logError('WebSocket message error: ' + err.message);
      }
    });

    ws.on('close', () => {
      activeConnections.delete(sessionId);
      logger.logInfo(`WebSocket disconnected: ${sessionId}`);
    });

    ws.on('error', err => {
      logger.logError('WebSocket error: ' + err.message);
    });
  });

  return wss;
}

/**
 * Broadcast to all active clients
 */
function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const ws of activeConnections.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

/**
 * Handle incoming message
 */
function handleMessage(ws, sessionId, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'log':
      logger.logInfo(`WS Log (${sessionId}): ${data.message}`);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown type' }));
  }
}

/**
 * Send session-specific notification
 */
function notifySession(sessionId, message) {
  const ws = activeConnections.get(sessionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'notification', message }));
  }
}

module.exports = {
  initWebSocketServer,
  broadcast,
  notifySession
};

