# Amount Normalizer Documentation

A comprehensive module for precise transaction amount normalization in Stellar network applications.

## Table of Contents

1. [Overview](#overview)
2. [Why Precision Matters](#why-precision-matters)
3. [How Precision Issues Are Avoided](#how-precision-issues-are-avoided)
4. [Quick Start](#quick-start)
5. [API Reference](#api-reference)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Overview

The `amountNormalizer` module ensures all transaction amounts are stored consistently using integer base units (stroops for XLM), avoiding floating-point precision errors that are common in financial calculations.

### Key Features

- **Decimal.js Backend**: All calculations use Decimal.js for arbitrary-precision decimal arithmetic
- **Integer Storage**: All amounts are stored as integers in base units
- **Multi-Asset Support**: Works with XLM, USDC, EURT, and custom assets
- **Comprehensive Validation**: Input validation with detailed error messages
- **Configurable**: Settings can be overridden via environment variables

---

## Why Precision Matters

### The Floating-Point Problem

JavaScript uses IEEE 754 double-precision floating-point numbers for all numeric operations. This causes precision issues:

```javascript
// Classic floating-point error
console.log(0.1 + 0.2);  // Output: 0.30000000000000004
console.log(0.1 * 0.2);  // Output: 0.020000000000000004

// Stellar example - WRONG way
const xlmAmount = 10.5;
const stroops = xlmAmount * 10000000;  // May lose precision!
console.log(stroops);  // Output: 105000000 (might be correct, but unreliable)
```

### Financial System Requirements

For financial applications, these small errors compound:
- A 0.0000001 XLM error on each of 10,000 transactions = 0.001 XLM loss
- Repeated operations can amplify errors
- Database storage of floats causes inconsistency

---

## How Precision Issues Are Avoided

### 1. Decimal.js for All Arithmetic

Instead of JavaScript's native arithmetic, we use Decimal.js:

```javascript
const Decimal = require('decimal.js');

// WRONG - JavaScript floating-point
const wrong = 0.1 + 0.2;  // 0.30000000000000004

// RIGHT - Decimal.js arbitrary precision
const right = new Decimal('0.1').plus('0.2');  // '0.3'
```

### 2. String-Based Operations

All amounts are passed as strings, not numbers:

```javascript
// WRONG - Number loses precision
toBaseUnit(0.1 + 0.2);  // Potential precision loss

// RIGHT - String preserves exact value
toBaseUnit('0.1');      // Guaranteed precision
toBaseUnit('0.3');      // Guaranteed precision
```

### 3. Integer Base Units

The Stellar network uses integer base units internally:

```
1 XLM = 10,000,000 stroops
1 USDC = 10,000,000 micro-USDC
```

We convert to base units early and keep them as integers:

```javascript
// Store in database as integer string
const stroops = toBaseUnit('10.5');  // '105000000'

// When displaying, convert back
const display = fromBaseUnit('105000000');  // '10.5'
```

### 4. No Implicit Conversions

The module never converts to JavaScript numbers internally:

```javascript
// Internal representation is always string
const decimal = new Decimal('0.123456789012345678901234567890');
// Still accurate - no floating-point truncation
```

### 5. Explicit Precision Handling

When precision might be lost, the module either:
- **Throws an error** (strict mode) if fractional base units would result
- **Rounds to nearest** if the loss is minimal (< 1 base unit)

---

## Quick Start

### Installation

```bash
npm install decimal.js
```

### Basic Usage

```javascript
const {
    toBaseUnit,
    fromBaseUnit,
    validateAmount
} = require('./src/utils/amountNormalizer');

// Validate user input
const validation = validateAmount('10.5');
if (!validation.isValid) {
    console.error(validation.error.message);
    return;
}

// Convert to base unit for Stellar
const stroops = toBaseUnit('10.5');
console.log(stroops);  // '105000000'

// Convert back for display
const display = fromBaseUnit('105000000');
console.log(display);  // '10.5'
```

---

## API Reference

### Core Conversion Functions

#### `toBaseUnit(displayAmount, options)`

Converts a display amount to base units.

**Parameters:**
- `displayAmount` (string|number): Amount in display format (e.g., "10.5" XLM)
- `options.assetCode` (string, optional): Asset code (default: 'XLM')
- `options.issuer` (string, optional): Asset issuer for non-native assets
- `options.validate` (boolean, optional): Validate input first (default: true)
- `options.strictPrecision` (boolean, optional): Fail on precision loss (default: true)

**Returns:** String representation of base units

**Example:**
```javascript
const stroops = toBaseUnit('10.5');           // '105000000'
const usdc = toBaseUnit('25.50', { assetCode: 'USDC' });  // '255000000'
```

---

#### `fromBaseUnit(baseUnitAmount, options)`

Converts base units to display format.

**Parameters:**
- `baseUnitAmount` (string|number): Amount in base units
- `options.assetCode` (string, optional): Asset code (default: 'XLM')
- `options.displayDecimals` (number, optional): Override display decimals
- `options.removeTrailingZeros` (boolean, optional): Remove trailing zeros (default: true)

**Returns:** String representation of display amount

**Example:**
```javascript
const xlm = fromBaseUnit('105000000');        // '10.5'
const usdc = fromBaseUnit('255000000', { assetCode: 'USDC' });  // '25.5'
```

---

### Validation Functions

#### `validateAmount(amount, options)`

Validates an amount with detailed error information.

**Parameters:**
- `amount` (string|number): Amount to validate
- `options.assetCode` (string, optional): Asset code (default: 'XLM')
- `options.allowNegative` (boolean, optional): Allow negative amounts (default: false)
- `options.allowZero` (boolean, optional): Allow zero (default: true)
- `options.maxPrecision` (number, optional): Maximum decimal places

**Returns:**
```javascript
{
    isValid: true,
    normalized: '10.5',
    config: { /* asset config */ }
}
// or
{
    isValid: false,
    error: {
        code: 'NEGATIVE_AMOUNT',
        message: 'Amount cannot be negative',
        // ... additional details
    }
}
```

---

### Arithmetic Functions

```javascript
addAmounts('10', '20');           // '30'
subtractAmounts('50', '30');       // '20'
multiplyAmount('100', '0.5');      // '50'
divideAmounts('100', '4');         // '25'
compareAmounts('10', '20');        // -1 (10 < 20)
compareAmounts('20', '20');        // 0  (equal)
compareAmounts('30', '20');        // 1  (30 > 20)
```

---

### Formatting Functions

```javascript
parseAmount('$1,234.56');          // '1234.56' (handles currency symbols)
formatAmount('1234.56', { currencySymbol: '$' });  // '$1,234.56'
roundAmount('10.125', 2);          // '10.13'
getPrecision('10.1234');           // 4
```

---

### Utility Functions

```javascript
getAssetConfig('XLM');              // Get XLM configuration
getMaxAmount('XLM');                // '100000000000'
getMinAmount('XLM');                // '0.0000001'
isValidRange('50', 'XLM');          // true
toBigInt('10.5');                   // 105000000n
fromBigInt(105000000n);             // '10.5'
```

---

## Configuration

### Environment Variables

Create a `.env` file with these settings:

```bash
# Decimal.js precision (default: 20)
DECIMAL_PRECISION=20

# Maximum display decimals (default: 7 for XLM)
MAX_DISPLAY_DECIMALS=7

# Minimum/maximum transaction amounts
MIN_TRANSACTION_AMOUNT=0.0000001
MAX_TRANSACTION_AMOUNT=100000000000

# Custom asset configuration (JSON)
AMOUNT_NORMALIZER_CONFIG={"XLM":{"maxAmount":"100000000000"}}
```

### Asset Configuration

Default configurations are provided for:
- **XLM**: 7 decimals (1 XLM = 10^7 stroops)
- **USDC**: 7 decimals (Circle stablecoin)
- **EURT**: 7 decimals (Tempo euro stablecoin)

To add custom assets, modify the `DEFAULT_CONFIG` in `amountNormalizer.js`:

```javascript
const DEFAULT_CONFIG = {
    'CUSTOM': {
        code: 'CUSTOM',
        issuer: 'G...',
        decimals: 7,
        displayDecimals: 7,
        baseUnit: 'micro-CUSTOM',
        displayUnit: 'CUSTOM',
        maxAmount: '100000000000',
        minAmount: '0.0000001'
    }
};
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Input is not a valid amount format |
| `INVALID_TYPE` | Input is not a string or number |
| `NEGATIVE_AMOUNT` | Amount is negative (when not allowed) |
| `EXCEEDS_MAX` | Amount exceeds maximum allowed |
| `BELOW_MIN` | Amount is below minimum |
| `INVALID_PRECISION` | Too many decimal places |
| `UNKNOWN_ASSET` | Asset code not recognized |
| `EMPTY_INPUT` | Input is empty or null |
| `PARSE_ERROR` | Cannot parse input as number |

### Error Handling Example

```javascript
const { toBaseUnit, AmountNormalizationError, ErrorCodes } = require('./utils/amountNormalizer');

try {
    const stroops = toBaseUnit(userInput);
} catch (error) {
    if (error instanceof AmountNormalizationError) {
        switch (error.code) {
            case ErrorCodes.NEGATIVE_AMOUNT:
                // Handle negative input
                break;
            case ErrorCodes.EXCEEDS_MAX:
                // Handle amount too large
                break;
            default:
                // Handle other errors
        }
    }
}
```

---

## Best Practices

### 1. Always Validate User Input

```javascript
const validation = validateAmount(amount);
if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
}
```

### 2. Store as Base Units

```javascript
// Store in database
const payment = {
    amount: toBaseUnit(userAmount),  // Integer string
    asset: 'XLM',
    createdAt: new Date()
};

// When displaying
const displayAmount = fromBaseUnit(payment.amount);
```

### 3. Use Strings for Amounts

```javascript
// In API requests/responses
{ "amount": "10.5" }  // String, not number!

// In database
{ "amount": "105000000" }  // Integer string
```

### 4. Handle Rounding Explicitly

```javascript
// If you need to round
const rounded = roundAmount(amount, 7);  // Round to 7 decimals
```

### 5. Compare Amounts with compareAmounts

```javascript
// Don't use floating-point comparison
if (compareAmounts(amount, '100') > 0) {  // amount > 100
    // Handle
}
```

### 6. Use BigInt for High-Volume Systems

```javascript
// For MongoDB with high precision requirements
const bigIntAmount = toBigInt('10.5');
// Store as mongoose.Schema.Types.BigInt or String
```

---

## Transaction Flow Example

```javascript
async function processPayment(req, res) {
    const { amount, destination } = req.body;
    
    try {
        // 1. Validate input
        const validation = validateAmount(amount);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // 2. Convert to base unit
        const baseUnitAmount = toBaseUnit(amount);
        
        // 3. Check balance
        const balance = await getBalance(req.user.publicKey);
        if (compareAmounts(amount, balance) < 0) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }
        
        // 4. Build and submit transaction
        const transaction = await stellarService.submitPayment({
            source: req.user.publicKey,
            destination,
            amount: baseUnitAmount,
            asset: 'native'
        });
        
        // 5. Store transaction record
        await PaymentModel.create({
            source: req.user.publicKey,
            destination,
            amount: baseUnitAmount,  // Store as integer
            asset: 'XLM',
            decimals: 7,
            stellarTxHash: transaction.hash,
            status: 'completed'
        });
        
        res.json({
            success: true,
            amount: fromBaseUnit(baseUnitAmount),  // Convert back for response
            hash: transaction.hash
        });
        
    } catch (error) {
        console.error('Payment failed:', error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
}
```

---

## Testing

Run the examples to verify functionality:

```bash
node src/examples/amountNormalizerExamples.js
```

Expected output includes:
- Basic conversion demonstrations
- Validation test results
- Arithmetic operation examples
- Error handling demonstrations

---

## License

Internal use - StellarEduPay Backend
