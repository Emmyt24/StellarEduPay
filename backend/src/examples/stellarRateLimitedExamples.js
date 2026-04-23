'use strict';

/**
 * Express Route Examples for Stellar Rate-Limited Client
 * 
 * This file demonstrates how to integrate the StellarRateLimitedClient
 * into Express routes with proper error handling and logging.
 */

const express = require('express');
const router = express.Router();

const {
  getClient,
  StellarAPIError,
  ERROR_TYPES,
} = require('../services/stellarRateLimitedClient');

const logger = require('../utils/logger');

// Get the singleton client instance
const stellarClient = getClient();

/**
 * GET /api/stellar/status
 * Get rate-limited client status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const stats = stellarClient.getStats();
    const isReady = stellarClient.isReady();
    const rateLimitStatus = stellarClient.getRateLimitStatus();
    
    res.json({
      success: true,
      data: {
        clientReady: isReady,
        stats,
        rateLimit: rateLimitStatus,
      },
    });
  } catch (error) {
    logger.error('[API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get client status',
      message: error.message,
    });
  }
});

/**
 * GET /api/stellar/account/:publicKey
 * Get account information with rate limiting
 * 
 * Example: GET /api/stellar/account/GDZEE3VFBGHCXUFMTLRLYFWYKAFF3XQPENFLL5BZOCJBI27Q2QEGTOUY
 */
router.get('/account/:publicKey', async (req, res) => {
  const { publicKey } = req.params;
  const requestId = `account_${Date.now()}`;
  
  logger.info(`[API] Fetching account: ${publicKey}`, { requestId });
  
  try {
    // Validate public key format (basic check)
    if (!publicKey || publicKey.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PUBLIC_KEY',
        message: 'Invalid Stellar public key format',
      });
    }
    
    // Get account with rate limiting
    const account = await stellarClient.getAccount(publicKey, {
      requestId,
      priority: 5,
    });
    
    // Return account data
    res.json({
      success: true,
      data: {
        publicKey: account.account_id,
        sequence: account.sequence,
        balances: account.balances,
        flags: account.flags,
        thresholds: account.thresholds,
      },
    });
  } catch (error) {
    logger.error(`[API] Error fetching account ${publicKey}:`, error);
    
    if (error instanceof StellarAPIError) {
      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'ACCOUNT_NOT_FOUND',
          message: `Account ${publicKey} not found`,
        });
      }
      
      if (error.type === ERROR_TYPES.RATE_LIMIT) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((stellarClient.getRateLimitStatus().resetAt - Date.now()) / 1000),
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'ACCOUNT_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/stellar/transaction/:txHash
 * Get transaction by hash with rate limiting
 * 
 * Example: GET /api/stellar/transaction/a1b2c3d4e5f6...
 */
router.get('/transaction/:txHash', async (req, res) => {
  const { txHash } = req.params;
  const requestId = `tx_${Date.now()}`;
  
  logger.info(`[API] Fetching transaction: ${txHash}`, { requestId });
  
  try {
    // Validate transaction hash format (64 hex chars)
    if (!txHash || !/^[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TX_HASH',
        message: 'Invalid Stellar transaction hash format (expected 64 hex characters)',
      });
    }
    
    const transaction = await stellarClient.getTransaction(txHash, {
      requestId,
      priority: 5,
    });
    
    res.json({
      success: true,
      data: {
        hash: transaction.hash,
        ledger: transaction.ledger_attr || transaction.ledger,
        createdAt: transaction.created_at,
        sourceAccount: transaction.source_account,
        feePaid: transaction.fee_charged,
        maxFee: transaction.max_fee,
        feeBump: transaction.inner_transaction ? true : false,
        operations: transaction.operation_count,
        successful: transaction.successful,
        validAfter: transaction.valid_after,
        validBefore: transaction.valid_before,
      },
    });
  } catch (error) {
    logger.error(`[API] Error fetching transaction ${txHash}:`, error);
    
    if (error instanceof StellarAPIError) {
      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'TRANSACTION_NOT_FOUND',
          message: `Transaction ${txHash} not found`,
        });
      }
      
      if (error.type === ERROR_TYPES.RATE_LIMIT) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((stellarClient.getRateLimitStatus().resetAt - Date.now()) / 1000),
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'TRANSACTION_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/stellar/account/:publicKey/transactions
 * Get transactions for an account with rate limiting
 * 
 * Example: GET /api/stellar/account/GDZEE.../transactions?limit=10&order=desc
 */
router.get('/account/:publicKey/transactions', async (req, res) => {
  const { publicKey } = req.params;
  const { limit = '20', order = 'desc', cursor } = req.query;
  const requestId = `txs_${Date.now()}`;
  
  logger.info(`[API] Fetching transactions for account: ${publicKey}`, { requestId });
  
  try {
    // Validate inputs
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 200',
      });
    }
    
    if (!['asc', 'desc'].includes(order)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ORDER',
        message: 'Order must be "asc" or "desc"',
      });
    }
    
    const transactions = await stellarClient.getTransactionsForAccount(
      publicKey,
      {
        limit: parsedLimit,
        order,
        cursor,
        requestId,
        priority: 4,
      }
    );
    
    res.json({
      success: true,
      data: {
        transactions: transactions.records.map(tx => ({
          hash: tx.hash,
          ledger: tx.ledger_attr || tx.ledger,
          createdAt: tx.created_at,
          sourceAccount: tx.source_account,
          feePaid: tx.fee_charged,
          operationCount: tx.operation_count,
          successful: tx.successful,
        })),
        pagingToken: transactions.paging_token,
      },
    });
  } catch (error) {
    logger.error(`[API] Error fetching transactions for ${publicKey}:`, error);
    
    if (error instanceof StellarAPIError) {
      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'ACCOUNT_NOT_FOUND',
          message: `Account ${publicKey} not found`,
        });
      }
      
      if (error.type === ERROR_TYPES.RATE_LIMIT) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'TRANSACTIONS_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/stellar/ledger/latest
 * Get the latest ledger information with rate limiting
 */
router.get('/ledger/latest', async (req, res) => {
  const requestId = `ledger_${Date.now()}`;
  
  logger.info('[API] Fetching latest ledger', { requestId });
  
  try {
    const ledger = await stellarClient.getLatestLedger({
      requestId,
      priority: 3, // Lower priority for ledger queries
    });
    
    res.json({
      success: true,
      data: {
        sequence: ledger.sequence,
        hash: ledger.hash,
        prevHash: ledger.prev_hash,
        closedAt: ledger.closed_at,
        totalCoins: ledger.total_coins,
        feePool: ledger.fee_pool,
        baseFee: ledger.base_fee,
        baseReserve: ledger.base_reserve,
        maxTxSetSize: ledger.max_tx_set_size,
        txCount: ledger.transaction_count,
      },
    });
  } catch (error) {
    logger.error('[API] Error fetching latest ledger:', error);
    
    if (error instanceof StellarAPIError && error.type === ERROR_TYPES.RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'LEDGER_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/stellar/submit
 * Submit a signed transaction with rate limiting and retry
 * 
 * Example: POST /api/stellar/submit
 * Body: { "envelope": "base64-encoded-transaction-envelope" }
 */
router.post('/submit', async (req, res) => {
  const { envelope } = req.body;
  const requestId = `submit_${Date.now()}`;
  
  logger.info('[API] Submitting transaction', { requestId });
  
  try {
    // Validate envelope
    if (!envelope || typeof envelope !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ENVELOPE',
        message: 'Transaction envelope is required and must be a string',
      });
    }
    
    // Submit with high priority and more retries
    const result = await stellarClient.submitTransaction(envelope, {
      requestId,
      priority: 8, // Higher priority for submissions
    });
    
    logger.info(`[API] Transaction submitted successfully: ${result.hash}`, { requestId });
    
    res.json({
      success: true,
      data: {
        hash: result.hash,
        status: result.status,
        ledger: result.ledger,
        envelopeXdr: result.envelope_xdr,
        resultXdr: result.result_xdr,
      },
    });
  } catch (error) {
    logger.error('[API] Error submitting transaction:', error);
    
    if (error instanceof StellarAPIError) {
      if (error.type === ERROR_TYPES.VALIDATION) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TRANSACTION',
          message: error.message,
        });
      }
      
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: 'TRANSACTION_REJECTED',
          message: error.message,
        });
      }
      
      if (error.type === ERROR_TYPES.RATE_LIMIT) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'SUBMISSION_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/stellar/rate-limits
 * Update rate limits dynamically (admin endpoint)
 * 
 * Example: POST /api/stellar/rate-limits
 * Body: { "minTime": 100, "maxConcurrent": 5 }
 */
router.post('/rate-limits', async (req, res) => {
  const { minTime, maxConcurrent } = req.body;
  
  try {
    // Validate inputs
    if (minTime !== undefined && (typeof minTime !== 'number' || minTime < 10)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MIN_TIME',
        message: 'minTime must be a number >= 10',
      });
    }
    
    if (maxConcurrent !== undefined && (typeof maxConcurrent !== 'number' || maxConcurrent < 1)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MAX_CONCURRENT',
        message: 'maxConcurrent must be a number >= 1',
      });
    }
    
    const updatedConfig = stellarClient.updateLimits({
      minTime,
      maxConcurrent,
    });
    
    logger.info('[API] Rate limits updated', { minTime, maxConcurrent });
    
    res.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    logger.error('[API] Error updating rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/stellar/reset-stats
 * Reset client statistics (admin endpoint)
 */
router.post('/reset-stats', async (req, res) => {
  try {
    stellarClient.resetStats();
    logger.info('[API] Client statistics reset');
    
    res.json({
      success: true,
      message: 'Statistics reset successfully',
    });
  } catch (error) {
    logger.error('[API] Error resetting stats:', error);
    res.status(500).json({
      success: false,
      error: 'RESET_FAILED',
      message: error.message,
    });
  }
});

module.exports = router;
