require('dotenv').config();
const config = require('./config');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const studentRoutes = require('./routes/studentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { startPolling, stopPolling } = require('./services/transactionService');
const { startRetryWorker, stopRetryWorker, isRetryWorkerRunning } = require('./services/retryService');

const app = express();

app.use(cors());
app.use(express.json());

// ── Request timeout ───────────────────────────────────────────────────────────
// If a response has not been sent within REQUEST_TIMEOUT_MS, reply 503.
app.use((req, res, next) => {
  res.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
    const err = new Error(`Request timed out after ${config.REQUEST_TIMEOUT_MS}ms`);
    err.code = 'REQUEST_TIMEOUT';
    next(err);
  });
  next();
});

mongoose.connect(config.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startPolling();
    startRetryWorker();
  })
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler — all controllers forward errors here via next(err)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusMap = {
    TX_FAILED: 400,
    MISSING_MEMO: 400,
    INVALID_DESTINATION: 400,
    UNSUPPORTED_ASSET: 400,
    DUPLICATE_TX: 409,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    STELLAR_NETWORK_ERROR: 502,
    REQUEST_TIMEOUT: 503,
  };
  const status = statusMap[err.code] || err.status || 500;
  console.error(`[${err.code || 'ERROR'}] ${err.message}`);
  res.status(status).json({ error: err.message, code: err.code || 'INTERNAL_ERROR' });
});

const PORT = config.PORT;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`[Shutdown] Received ${signal} — starting graceful shutdown`);

  // Stop background workers so no new jobs are scheduled
  stopPolling();
  stopRetryWorker();

  // Wait for any in-progress retry batch to finish (max 8 s)
  const deadline = Date.now() + 8_000;
  while (isRetryWorkerRunning() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Stop accepting new HTTP connections; wait for active requests to complete
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('[Shutdown] MongoDB disconnected — clean exit');
      process.exit(0);
    } catch (err) {
      console.error('[Shutdown] Error closing MongoDB:', err.message);
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown stalls beyond 10 s
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
