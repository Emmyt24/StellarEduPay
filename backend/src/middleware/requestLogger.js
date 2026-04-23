'use strict';

/**
 * API Request Logging Middleware
 *
 * Logs every incoming request as a structured JSON line using the shared logger.
 * Captured fields:
 *   requestId  — unique ID per request (for correlation across log lines)
 *   method     — HTTP verb
 *   url        — full path + query string
 *   ip         — client IP (respects X-Forwarded-For when behind a proxy)
 *   statusCode — HTTP response status (logged on finish)
 *   durationMs — total response time in milliseconds
 *   userAgent  — caller's User-Agent header
 *   timestamp  — ISO-8601 (added by the logger itself)
 *
 * Logs are emitted as JSON to stdout, making them grep/jq-friendly and
 * compatible with any log aggregator (ELK, Datadog, CloudWatch, etc.).
 */

const { logger } = require('../utils/logger');

let _counter = 0;

function generateRequestId() {
  _counter = (_counter + 1) % 1_000_000;
  return `${Date.now()}-${process.pid}-${String(_counter).padStart(6, '0')}`;
}

function requestLogger() {
  return (req, res, next) => {
    const requestId = generateRequestId();
    const startedAt = Date.now();

    // Attach to req so downstream handlers can reference it (e.g. error logs)
    req.requestId = requestId;

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    logger.info('[Request] incoming', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger[level]('[Request] completed', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip,
      });
    });

    next();
  };
}

module.exports = { requestLogger };
