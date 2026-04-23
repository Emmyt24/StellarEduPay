"use strict";

/**
 * Lightweight retry wrapper for Stellar Horizon API calls.
 *
 * Retries transient failures (network timeouts, ECONNREFUSED, HTTP 429/5xx)
 * with exponential backoff + jitter.  Permanent errors (4xx other than 429)
 * are thrown immediately.
 *
 * Usage:
 *   const data = await withStellarRetry(() => server.transactions().transaction(hash).call());
 */

const logger = require("./logger").child("StellarRetry");

const DEFAULT_MAX_ATTEMPTS =
  parseInt(process.env.STELLAR_CALL_RETRY_ATTEMPTS, 10) || 3;
const DEFAULT_BASE_DELAY =
  parseInt(process.env.STELLAR_CALL_RETRY_DELAY_MS, 10) || 1000;
const MAX_DELAY_MS = 10000;

function isTransient(err) {
  // Network-level errors
  if (
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ].includes(err.code)
  ) {
    return true;
  }
  if (err.message && /timeout|network|socket hang up/i.test(err.message)) {
    return true;
  }

  // Stellar Horizon HTTP status codes
  const status =
    err.response?.status ||
    err.response?.statusCode ||
    err.status ||
    err.statusCode;

  if (status === 429) return true; // Rate-limited
  if (status >= 500 && status < 600) return true; // Server error

  return false;
}

/**
 * Classify a Horizon/network error into a structured app error.
 *
 * Returns an Error with:
 *   .code    — app-level error code
 *   .status  — HTTP status to return to the client
 *   .message — human-readable message
 */
function classifyHorizonError(err, context = "") {
  const status =
    err.response?.status ||
    err.response?.statusCode ||
    err.status ||
    err.statusCode;

  // Transaction / resource not found on Horizon
  if (status === 404) {
    const e = new Error(
      context
        ? `${context} not found on the Stellar network`
        : "Transaction not found on the Stellar network",
    );
    e.code = "NOT_FOUND";
    e.status = 404;
    return e;
  }

  // Rate limited
  if (status === 429) {
    const e = new Error(
      "Stellar Horizon is rate-limiting requests. Please retry shortly.",
    );
    e.code = "HORIZON_UNAVAILABLE";
    e.status = 503;
    return e;
  }

  // Horizon server error
  if (status >= 500 && status < 600) {
    const e = new Error(
      "Stellar Horizon is temporarily unavailable. Please retry shortly.",
    );
    e.code = "HORIZON_UNAVAILABLE";
    e.status = 503;
    return e;
  }

  // Network-level errors (no HTTP response)
  const NETWORK_CODES = [
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
  ];
  if (
    NETWORK_CODES.includes(err.code) ||
    /timeout|network|socket hang up/i.test(err.message || "")
  ) {
    const e = new Error(
      "Cannot reach the Stellar Horizon API. Please retry shortly.",
    );
    e.code = "HORIZON_UNAVAILABLE";
    e.status = 503;
    return e;
  }

  // Pass through already-classified app errors
  if (err.code && err.status) return err;

  // Unknown — treat as Stellar network error
  const e = new Error(err.message || "Unexpected Stellar network error");
  e.code = "STELLAR_NETWORK_ERROR";
  e.status = 502;
  return e;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Function} fn           — async function that performs the Stellar API call
 * @param {object}   [opts]
 * @param {number}   [opts.maxAttempts] — total attempts (default 3)
 * @param {number}   [opts.baseDelay]   — initial backoff in ms (default 1000)
 * @param {string}   [opts.label]       — label for log messages
 * @returns {Promise<*>}
 */
async function withStellarRetry(fn, opts = {}) {
  const maxAttempts = opts.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const baseDelay = opts.baseDelay || DEFAULT_BASE_DELAY;
  const label = opts.label || "StellarCall";

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (!isTransient(err) || attempt === maxAttempts) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1),
        MAX_DELAY_MS,
      );
      const jitter = Math.floor(Math.random() * delay * 0.3);
      const waitMs = delay + jitter;

      logger.warn(
        `${label} attempt ${attempt}/${maxAttempts} failed — retrying in ${waitMs}ms`,
        {
          error: err.message,
          code: err.code,
          status: err.response?.status,
        },
      );

      await sleep(waitMs);
    }
  }

  throw lastErr;
}

module.exports = { withStellarRetry, isTransient, classifyHorizonError };
