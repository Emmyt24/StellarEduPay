# Rate-Limited Stellar API Client

## Overview

The `StellarRateLimitedClient` is a production-ready, rate-limited wrapper for the Stellar Horizon API. It provides request throttling, automatic retry with exponential backoff, and comprehensive monitoring for high-traffic financial systems.

## Features

- **Request Throttling**: Limits concurrent requests and enforces minimum time between requests
- **Queue Management**: In-memory queue with priority support and burst protection
- **Automatic Retries**: Exponential backoff for failed requests (HTTP 429, 5xx, network errors)
- **Burst Protection**: Prevents traffic spikes that could overwhelm the API
- **Configurable Limits**: All settings adjustable via environment variables
- **Comprehensive Logging**: JSON-formatted logs for request flow monitoring
- **Streaming Support**: Real-time payment and transaction streams
- **Statistics & Monitoring**: Real-time queue depth, rate limit status, and request metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Code                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Routes                                │
│  (stellarRateLimitedExamples.js)                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               StellarRateLimitedClient                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Request Queue   │  │   Bottleneck      │  │ Retry Logic   │ │
│  │  (Priority-based) │  │   (Rate Limiter)  │  │ (Exponential) │ │
│  └─────────────────┘  └──────────────────┘  └───────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Stellar Horizon API                          │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install bottleneck
```

### 2. Basic Usage

```javascript
const { getClient } = require('./services/stellarRateLimitedClient');

// Get singleton instance
const stellarClient = getClient();

// Use in async function
async function fetchAccount(publicKey) {
  const account = await stellarClient.getAccount(publicKey);
  console.log('Balances:', account.balances);
}
```

### 3. Configure via Environment Variables

Add these to your `.env` file:

```bash
STELLAR_RATE_LIMIT_MIN_TIME=50
STELLAR_RATE_LIMIT_MAX_CONCURRENT=10
STELLAR_RETRY_MAX_ATTEMPTS=5
```

## API Reference

### Initialization

#### `getClient(options)`

Get or create a singleton client instance.

```javascript
const { getClient } = require('./services/stellarRateLimitedClient');

const client = getClient({
  horizonUrl: 'https://horizon-testnet.stellar.org',
  maxQueueSize: 100,
});
```

#### `createClient(options)`

Create a new client instance (not singleton).

```javascript
const { createClient } = require('./services/stellarRateLimitedClient');

const client1 = createClient({ /* config */ });
const client2 = createClient({ /* different config */ });
```

### Account Operations

#### `getAccount(publicKey, options)`

Fetch account information from Horizon.

```javascript
const account = await client.getAccount('GDZEE3VFBGHCXUFMTLRLYFWYKAFF3XQPENFLL5BZOCJBI27Q2QEGTOUY');

// Options
const account = await client.getAccount(publicKey, {
  priority: 5,      // 1-10, higher = faster processing
  requestId: 'custom-id', // Custom request identifier
});
```

#### `getAccountBalances(publicKey, options)`

Get account balances (convenience method).

```javascript
const balances = await client.getAccountBalances(publicKey);
```

### Transaction Operations

#### `getTransaction(txHash, options)`

Fetch a transaction by hash.

```javascript
const tx = await client.getTransaction('a1b2c3d4e5f6...');

// Returns transaction details including:
// - hash, ledger, createdAt
// - sourceAccount, feePaid
// - successful, operationCount
```

#### `getTransactionsForAccount(publicKey, options)`

Fetch transactions for an account.

```javascript
const txs = await client.getTransactionsForAccount(publicKey, {
  limit: 20,    // Number of transactions (1-200)
  order: 'desc' // 'asc' or 'desc'
});
```

#### `submitTransaction(envelope, options)`

Submit a signed transaction with enhanced retry logic.

```javascript
const result = await client.submitTransaction(signedEnvelope);

// Returns:
// { hash, status, ledger, envelopeXdr, resultXdr }
```

### Ledger Operations

#### `getLatestLedger(options)`

Get the latest ledger information.

```javascript
const ledger = await client.getLatestLedger();
```

#### `getLedger(sequence, options)`

Get a specific ledger by sequence number.

```javascript
const ledger = await client.getLedger(1234567);
```

### Streaming

#### `streamPayments(publicKey, callback, options)`

Stream incoming payments for an account.

```javascript
const close = client.streamPayments(publicKey, (payment) => {
  console.log('Payment received:', payment);
}, {
  cursor: 'now',     // Starting cursor
  onError: (err) => {},  // Error handler
  onClose: () => {},     // Close handler
});

// To stop streaming:
close();
```

#### `streamTransactions(publicKey, callback, options)`

Stream transactions for an account.

```javascript
const close = client.streamTransactions(publicKey, (tx) => {
  console.log('Transaction:', tx.hash);
});
```

### Utility Methods

#### `getStats()`

Get client statistics.

```javascript
const stats = client.getStats();
// {
//   totalRequests: 1000,
//   successfulRequests: 980,
//   failedRequests: 20,
//   retriedRequests: 50,
//   rateLimitedRequests: 5,
//   queue: { queued: 10, processing: 3, ... },
//   rateLimit: { remaining: 3500, resetAt: ... },
//   limiter: { queued: 10, running: 3, done: 980 }
// }
```

#### `getRateLimitStatus()`

Get current rate limit status from Horizon headers.

```javascript
const status = client.getRateLimitStatus();
// { remaining: 3500, resetAt: 1699999999999, lastUpdated: 1699999000000 }
```

#### `isReady()`

Check if the client can accept new requests (not overloaded).

```javascript
if (client.isReady()) {
  // Safe to submit new requests
}
```

#### `updateLimits(newLimits)`

Dynamically update rate limits.

```javascript
client.updateLimits({
  minTime: 100,         // New minimum time between requests
  maxConcurrent: 5,     // New max concurrent requests
});
```

#### `resetStats()`

Reset statistics counters.

```javascript
client.resetStats();
```

#### `disconnect()`

Gracefully disconnect the client.

```javascript
await client.disconnect();
```

## Error Handling

### Error Types

```javascript
const { ERROR_TYPES, StellarAPIError } = require('./services/stellarRateLimitedClient');

// Error types
ERROR_TYPES.RATE_LIMIT    // HTTP 429 - Rate limit exceeded
ERROR_TYPES.TIMEOUT        // Request timeout
ERROR_TYPES.NETWORK       // Network connectivity issues
ERROR_TYPES.SERVER         // Server errors (5xx)
ERROR_TYPES.VALIDATION    // Client errors (4xx)
ERROR_TYPES.RETRY_EXHAUSTED // Max retries exceeded
```

### Handling Errors

```javascript
const { StellarAPIError, ERROR_TYPES } = require('./services/stellarRateLimitedClient');

try {
  const account = await client.getAccount(publicKey);
} catch (error) {
  if (error instanceof StellarAPIError) {
    console.log('Error type:', error.type);
    console.log('Status code:', error.statusCode);
    console.log('Request ID:', error.requestId);
    
    if (error.type === ERROR_TYPES.RATE_LIMIT) {
      // Wait and retry
      const retryAfter = Math.ceil((client.getRateLimitStatus().resetAt - Date.now()) / 1000);
      console.log(`Retry after ${retryAfter} seconds`);
    }
  }
}
```

### Express Route Error Handling

```javascript
const { StellarAPIError, ERROR_TYPES } = require('./services/stellarRateLimitedClient');

router.get('/account/:publicKey', async (req, res) => {
  try {
    const account = await client.getAccount(req.params.publicKey);
    res.json({ success: true, data: account });
  } catch (error) {
    if (error instanceof StellarAPIError) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: 'Account not found' });
      }
      if (error.type === ERROR_TYPES.RATE_LIMIT) {
        return res.status(429).json({ 
          error: 'Rate limited',
          retryAfter: 60 
        });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STELLAR_RATE_LIMIT_MIN_TIME` | 50 | Min time between requests (ms) |
| `STELLAR_RATE_LIMIT_MAX_CONCURRENT` | 10 | Max concurrent requests |
| `STELLAR_RATE_LIMIT_HIGH_WATER` | 100 | Queue high water mark |
| `STELLAR_RATE_LIMIT_STRATEGY` | LEAK | Queue strategy (LEAK/OVERFLOW) |
| `STELLAR_RETRY_MAX_ATTEMPTS` | 5 | Max retry attempts |
| `STELLAR_RETRY_INITIAL_DELAY` | 1000 | Initial retry delay (ms) |
| `STELLAR_RETRY_MAX_DELAY` | 30000 | Max retry delay (ms) |
| `STELLAR_RETRY_FACTOR` | 2 | Exponential backoff factor |
| `STELLAR_BURST_ALLOWANCE` | 20 | Max burst size |
| `STELLAR_BURST_WINDOW` | 1000 | Burst window (ms) |

### Priority System

Requests can have priorities from 1-10 (higher = faster processing):

```javascript
// High priority - user-facing requests
await client.getAccount(publicKey, { priority: 8 });

// Low priority - background jobs
await client.getTransactions(publicKey, { priority: 2 });
```

### Queue Strategy

- **LEAK**: Process oldest requests first (default) - recommended for most use cases
- **OVERFLOW**: Reject newest requests when queue is full

## Best Practices

### 1. Use Singleton Pattern

```javascript
// Good: Use singleton
const client = getClient();

// Avoid: Creating multiple instances
const client1 = createClient();
const client2 = createClient();
```

### 2. Handle Rate Limits Gracefully

```javascript
router.get('/data', async (req, res) => {
  try {
    const data = await client.getData();
    res.json(data);
  } catch (error) {
    if (error.type === ERROR_TYPES.RATE_LIMIT) {
      res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: 60 
      });
    }
  }
});
```

### 3. Monitor Queue Depth

```javascript
// Check before submitting batch requests
if (!client.isReady()) {
  console.warn('Client is busy, waiting...');
}

// Monitor in production
setInterval(() => {
  const stats = client.getStats();
  console.log('Queue depth:', stats.queue.queued);
  console.log('Utilization:', stats.queue.utilization);
}, 10000);
```

### 4. Use Appropriate Priorities

```javascript
// User-initiated requests - high priority
await client.getAccount(userPublicKey, { priority: 8 });

// Background syncs - low priority
await client.syncPayments({ priority: 2 });
```

### 5. Set Timeouts

```javascript
const client = createClient({
  timeout: 30000, // 30 second timeout
});
```

## Performance Considerations

### Recommended Settings

For high-traffic production systems:

```bash
# Conservative settings
STELLAR_RATE_LIMIT_MIN_TIME=100
STELLAR_RATE_LIMIT_MAX_CONCURRENT=5

# Moderate settings
STELLAR_RATE_LIMIT_MIN_TIME=50
STELLAR_RATE_LIMIT_MAX_CONCURRENT=10

# Aggressive settings (use with caution)
STELLAR_RATE_LIMIT_MIN_TIME=25
STELLAR_RATE_LIMIT_MAX_CONCURRENT=20
```

### Throughput Estimates

| Settings | Approximate Throughput |
|----------|----------------------|
| minTime: 100ms, maxConcurrent: 5 | ~50 req/sec |
| minTime: 50ms, maxConcurrent: 10 | ~200 req/sec |
| minTime: 25ms, maxConcurrent: 20 | ~800 req/sec |

### Queue Sizing

```bash
# For 1000 concurrent users making 1 request/minute
STELLAR_RATE_LIMIT_HIGH_WATER=500

# For 100 concurrent users
STELLAR_RATE_LIMIT_HIGH_WATER=100
```

## Logging

The client uses JSON-formatted logging:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Request queued",
  "args": ["stellar_12345"],
  "pid": 1234
}
```

Set log level via environment:

```bash
LOG_LEVEL=DEBUG  # All logs
LOG_LEVEL=INFO   # Info and above
LOG_LEVEL=WARN   # Warnings and errors only
LOG_LEVEL=ERROR  # Only errors
```

## Examples

See `src/examples/stellarRateLimitedExamples.js` for complete Express route examples including:

- Account information retrieval
- Transaction lookup
- Transaction submission
- Rate limit status monitoring
- Dynamic rate limit adjustment
- Statistics reset

## Troubleshooting

### Queue Full Errors

```
Queue is full (100 requests). Try again later.
```

**Solution**: Increase `STELLAR_RATE_LIMIT_HIGH_WATER` or reduce request volume.

### High Retry Rates

If you see many retries in logs:

1. Check Horizon server status
2. Reduce `STELLAR_RATE_LIMIT_MIN_TIME`
3. Increase `STELLAR_RETRY_MAX_DELAY`

### Timeout Errors

Increase timeout settings:

```bash
STELLAR_RETRY_INITIAL_DELAY=2000
STELLAR_RETRY_MAX_DELAY=60000
```

## License

MIT License - See project license for details
