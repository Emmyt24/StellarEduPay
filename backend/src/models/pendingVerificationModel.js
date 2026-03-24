const mongoose = require('mongoose');

/**
 * Stores transactions that could not be verified due to a Stellar network outage.
 * The retry service will pick these up and re-attempt verification once the
 * network is reachable again.
 */
const pendingVerificationSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, default: null },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date, default: null },
  nextRetryAt: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'dead_letter'],
    default: 'pending',
    index: true,
  },
  lastError: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PendingVerification', pendingVerificationSchema);
