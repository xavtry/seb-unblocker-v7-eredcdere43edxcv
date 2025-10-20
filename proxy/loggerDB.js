/**
 * loggerDB.js
 * Handles persistent logging of proxy requests, errors, and events
 * Supports writing to file, database, or future analytics
 */

const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../logs/proxy.log');

function logRequest(ip, url, headers) {
    const logEntry = {
        type: 'request',
        timestamp: new Date().toISOString(),
        ip,
        url,
        headers,
    };
    writeLog(logEntry);
}

function logError(err, context = {}) {
    const logEntry = {
        type: 'error',
        timestamp: new Date().toISOString(),
        message: err.message,
        stack: err.stack,
        context,
    };
    writeLog(logEntry);
}

function logEvent(message, context = {}) {
    const logEntry = {
        type: 'event',
        timestamp: new Date().toISOString(),
        message,
        context,
    };
    writeLog(logEntry);
}

function writeLog(entry) {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFile(logFile, line, (err) => {
        if (err) console.error('Failed to write log:', err);
    });
}

// Future hooks for DB or analytics
function queryLogs(filter = {}) {
    if (!fs.existsSync(logFile)) return [];
    const data = fs.readFileSync(logFile, 'utf-8');
    const lines = data.split('\n').filter(Boolean).map(JSON.parse);
    return lines.filter(log => {
        for (let key in filter) {
            if (log[key] !== filter[key]) return false;
        }
        return true;
    });
}

module.exports = { logRequest, logError, logEvent, queryLogs };
