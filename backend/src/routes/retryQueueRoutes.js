/**
 * Retry Queue Routes
 * 
 * API endpoints for managing the transaction retry queue system.
 * All routes require admin authentication.
 */

const express = require('express');
const {
  getStats,
  getHealth,
  getJob,
  getJobs,
  manualRetry,
  deleteJob,
  pause,
  resume,
  queueTransaction,
} = require('../controllers/retryQueueController');
const { requireAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Apply admin auth to all retry queue routes
router.use(requireAdminAuth);

// Queue statistics and monitoring
router.get('/stats', getStats);
router.get('/health', getHealth);

// Job management
router.get('/jobs/:jobId', getJob);
router.get('/jobs/state/:state', getJobs);
router.post('/jobs/:jobId/retry', manualRetry);
router.delete('/jobs/:jobId', deleteJob);

// Queue control
router.post('/pause', pause);
router.post('/resume', resume);

// Manual transaction queuing
router.post('/queue', queueTransaction);

module.exports = router;
