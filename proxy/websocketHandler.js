/**
 * websocketHandler.js
 * Handles live WebSocket connections for proxy updates, notifications, and user interactions
 */

const WebSocket = require('ws');
const { logEvent } = require('./logger');
const { validateUrl } = require('./validator');
const clients = new Map(); // Map clientId -> ws

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const clientId = generateClientId();
        clients.set(clientId, ws);
        logEvent('WebSocket connected: ' + clientId);

        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg);
                handleMessage(ws, clientId, data);
            } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
            }
        });

        ws.on('close', () => {
            clients.delete(clientId);
            logEvent('WebSocket disconnected: ' + clientId);
        });
    });
}

function handleMessage(ws, clientId, data) {
    switch (data.type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        case 'fetch':
            if (validateUrl(data.url)) {
                // trigger a fetch event or notify proxy system
                ws.send(JSON.stringify({ type: 'fetchStarted', url: data.url }));
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid URL' }));
            }
            break;
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown command' }));
    }
}

function broadcast(event) {
    for (const ws of clients.values()) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    }
}

function generateClientId() {
    return 'ws_' + Math.random().toString(36).substr(2, 9);
}

module.exports = { setupWebSocket, broadcast };
