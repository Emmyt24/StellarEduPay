const Payment = require('../models/paymentModel');
const PaymentIntent = require('../models/paymentIntentModel');
const Student = require('../models/studentModel');
const { syncPayments, verifyTransaction } = require('../services/stellarService');
const { SCHOOL_WALLET, ACCEPTED_ASSETS } = require('../config/stellarConfig');
const crypto = require('crypto');

// GET /api/payments/instructions/:studentId
async function getPaymentInstructions(req, res) {
  try {
    const { studentId } = req.params;
    res.json({
      walletAddress: SCHOOL_WALLET,
      memo: studentId,
      acceptedAssets: Object.values(ACCEPTED_ASSETS).map(a => ({
        code: a.code,
        type: a.type,
        displayName: a.displayName,
      })),
      note: 'Include the payment intent memo exactly when sending payment to ensure your fees are credited.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/payments/intent
async function createPaymentIntent(req, res) {
  try {
    const { studentId } = req.body;
    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Generate a unique memo for this payment
    const memo = crypto.randomBytes(4).toString('hex').toUpperCase();

    const intent = await PaymentIntent.create({
      studentId,
      amount: student.feeAmount,
      memo,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    });

    res.status(201).json(intent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/payments/verify
async function verifyPayment(req, res) {
  try {
    const { txHash } = req.body;
    const result = await verifyTransaction(txHash);
    if (!result) return res.status(404).json({ error: 'Payment not found or invalid' });
    if (result.error === 'unsupported_asset') {
      return res.status(400).json({
        error: `Unsupported asset: ${result.assetCode}. Accepted assets: ${Object.keys(ACCEPTED_ASSETS).join(', ')}`,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/payments/sync
async function syncAllPayments(req, res) {
  try {
    await syncPayments();
    res.json({ message: 'Sync complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/payments/:studentId
async function getStudentPayments(req, res) {
  try {
    const payments = await Payment.find({ studentId: req.params.studentId }).sort({ confirmedAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/payments/accepted-assets
async function getAcceptedAssets(req, res) {
  try {
    const assets = Object.values(ACCEPTED_ASSETS).map(a => ({
      code: a.code,
      type: a.type,
      displayName: a.displayName,
    }));
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getPaymentInstructions,
  verifyPayment,
  syncAllPayments,
  getStudentPayments,
  getAcceptedAssets,
  createPaymentIntent,
};
