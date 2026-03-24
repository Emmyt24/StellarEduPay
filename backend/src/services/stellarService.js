const { server, SCHOOL_WALLET, isAcceptedAsset } = require('../config/stellarConfig');
const Payment = require('../models/paymentModel');
const Student = require('../models/studentModel');
const PaymentIntent = require('../models/paymentIntentModel');

/**
 * Detect asset information from a Stellar payment operation.
 * Returns { assetCode, assetType, assetIssuer } or null if unsupported.
 */
function detectAsset(payOp) {
  const assetType = payOp.asset_type;
  const assetCode = assetType === 'native' ? 'XLM' : payOp.asset_code;
  const assetIssuer = assetType === 'native' ? null : payOp.asset_issuer;

  const { accepted } = isAcceptedAsset(assetCode, assetType);
  if (!accepted) return null;

  return { assetCode, assetType, assetIssuer };
}

/**
 * Normalize a raw amount string to a number with consistent precision.
 */
function normalizeAmount(rawAmount) {
  return parseFloat(parseFloat(rawAmount).toFixed(7));
}

// Fetch recent transactions to the school wallet and record new payments
async function syncPayments() {
  const transactions = await server
    .transactions()
    .forAccount(SCHOOL_WALLET)
    .order('desc')
    .limit(20)
    .call();

  for (const tx of transactions.records) {
    const memo = tx.memo;
    if (!memo) continue;

    // Reject outdated transactions
    if (!isWithinTimeWindow(tx.created_at)) continue;

    const exists = await Payment.findOne({ txHash: tx.hash });
    if (exists) continue;

    const ops = await tx.operations();
    const payOp = ops.records.find(op => op.type === 'payment' && op.to === SCHOOL_WALLET);
    if (!payOp) continue;

    // Detect asset type and reject unsupported assets
    const asset = detectAsset(payOp);
    if (!asset) continue; // skip unsupported assets

    // Find the corresponding payment intent by memo
    const intent = await PaymentIntent.findOne({ memo, status: 'pending' });
    if (!intent) continue;

    const student = await Student.findOne({ studentId: intent.studentId });
    if (!student) continue;

    const paymentAmount = parseFloat(payOp.amount);

    // Validate payment amount against the intent expected amount
    const feeValidation = validatePaymentAgainstFee(paymentAmount, intent.amount);

    await Payment.create({
      studentId: intent.studentId,
      txHash: tx.hash,
      amount: paymentAmount,
      feeAmount: intent.amount,
      feeValidationStatus: feeValidation.status,
      memo,
      confirmedAt: new Date(tx.created_at),
    });

    // Mark intent as completed
    await PaymentIntent.findByIdAndUpdate(intent._id, { status: 'completed' });

    // Only mark as paid if the payment meets or exceeds the required fee
    if (feeValidation.status === 'valid' || feeValidation.status === 'overpaid') {
      await Student.findOneAndUpdate({ studentId: intent.studentId }, { feePaid: true });
    }
  }
}

// Verify a single transaction hash against the school wallet
async function verifyTransaction(txHash) {
  const tx = await server.transactions().transaction(txHash).call();
  const ops = await tx.operations();
  const payOp = ops.records.find(op => op.type === 'payment' && op.to === SCHOOL_WALLET);
  if (!payOp) return null;

  const amount = parseFloat(payOp.amount);

  // Find corresponding intent
  const intent = await PaymentIntent.findOne({ memo: tx.memo });
  if (!intent) return { hash: tx.hash, error: 'no_matching_intent', message: 'No pending payment intent found for this memo' };

  const student = await Student.findOne({ studentId: intent.studentId });
  const feeValidation = validatePaymentAgainstFee(amount, intent.amount);

  return {
    hash: tx.hash,
    memo: tx.memo,
    intentId: intent._id,
    studentId: intent.studentId,
    amount,
    expectedAmount: intent.amount,
    feeValidation,
    date: tx.created_at,
  };
}

/**
 * Validate a payment amount against the expected fee.
 * @param {number} paymentAmount — the amount actually paid
 * @param {number} expectedFee — the fee the student owes
 * @returns {{ status: string, message: string }}
 */
function validatePaymentAgainstFee(paymentAmount, expectedFee) {
  if (paymentAmount < expectedFee) {
    return {
      status: 'underpaid',
      message: `Payment of ${paymentAmount} is less than the required fee of ${expectedFee}`,
    };
  }
  if (paymentAmount > expectedFee) {
    return {
      status: 'overpaid',
      message: `Payment of ${paymentAmount} exceeds the required fee of ${expectedFee}`,
    };
  }
  return {
    status: 'valid',
    message: 'Payment matches the required fee',
  };
}

module.exports = { syncPayments, verifyTransaction, validatePaymentAgainstFee };
