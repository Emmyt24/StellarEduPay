# Webhook Notification System

StellarEduPay can notify external systems in real-time when payment events occur.

## Setup

### 1. Register a webhook URL

Register your endpoint via the admin dashboard or API:

```
POST /api/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["payment.confirmed", "payment.failed"]
}
```

### 2. Receive events

Your endpoint receives POST requests with JSON body:

```json
{
  "event": "payment.confirmed",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "data": {
    "transactionHash": "abc123...",
    "studentId": "STU-001",
    "amount": 100.5,
    "assetCode": "XLM",
    "confirmedAt": "2026-03-27T10:30:00.000Z"
  }
}
```

## Events

| Event | Trigger |
|-------|---------|
| `payment.confirmed` | Payment verified and ledger-confirmed |
| `payment.pending` | Payment detected, awaiting confirmation |
| `payment.failed` | Payment failed on Stellar network |
| `payment.suspicious` | Flagged by fraud detection |

## Acknowledge quickly

Your webhook should respond with **HTTP 200** within **10 seconds** to avoid timeouts.

## Retry logic

If your server is unavailable, the webhook will be retried up to 3 times with exponential backoff.
