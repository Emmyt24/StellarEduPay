const express = require('express');
const router = express.Router();
const {
  getPaymentInstructions,
  verifyPayment,
  syncAllPayments,
  getStudentPayments,
  getAcceptedAssets,
  createPaymentIntent,
} = require('../controllers/paymentController');

router.get('/accepted-assets', getAcceptedAssets);
router.get('/instructions/:studentId', getPaymentInstructions);
router.get('/:studentId', getStudentPayments);
router.post('/verify', verifyPayment);
router.post('/sync', syncAllPayments);
router.post('/intent', createPaymentIntent);

module.exports = router;

