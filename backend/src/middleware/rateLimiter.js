'use strict';

const rateLimit = require('express-rate-limit');

// General limiter — applied globally to all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
});

// Strict limiter — for sensitive POST endpoints (sync, verify)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to this endpoint, please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
});

module.exports = { generalLimiter, strictLimiter };
