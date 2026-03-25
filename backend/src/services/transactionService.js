'use strict';

/**
 * Transaction Poller
 *
 * Polls all active schools' Stellar wallets on a fixed interval.
 * Before multi-school support this polled a single global wallet;
 * now it fans out to every active school in parallel.
 */

const School = require('../models/schoolModel');
const { syncPaymentsForSchool } = require('./stellarService');
const { POLL_INTERVAL_MS } = require('../config');
const logger = require('../utils/logger').child('TransactionPoller');

let _timer = null;

function startPolling() {
  if (_timer) return;
  logger.info(`Starting — interval: ${POLL_INTERVAL_MS}ms`);

  const run = async () => {
    try {
      const schools = await School.find({ isActive: true }).lean();
      if (schools.length === 0) return;

      const results = await Promise.allSettled(schools.map(s => syncPaymentsForSchool(s)));

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          logger.error(`Sync error for school ${schools[i].schoolId}`, { error: result.reason?.message, schoolId: schools[i].schoolId });
        }
      });
    } catch (err) {
      logger.error('Fatal sync error', { error: err.message, stack: err.stack });
    }
  };

  run();
  _timer = setInterval(run, POLL_INTERVAL_MS);
  _timer.unref();
}

function stopPolling() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    logger.info('Stopped');
  }
}

module.exports = { startPolling, stopPolling };
