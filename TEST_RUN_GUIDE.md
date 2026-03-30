# Test Run Guide - syncPayments Tests

## Quick Start

Run the new tests immediately:

```bash
npm test -- stellar.test.js
```

## What Was Added

Three new test cases for `syncPaymentsForSchool`:

1. **Unmatched Memo Test** - Verifies transactions with unknown student IDs are skipped
2. **No Memo Test** - Verifies transactions without memos are skipped
3. **Empty Memo Test** - Verifies transactions with whitespace-only memos are skipped

## Expected Test Output

```
PASS  tests/stellar.test.js
  validatePaymentAgainstFee
    ✓ valid when payment equals fee
    ✓ underpaid when payment is less than fee
    ✓ overpaid when payment exceeds fee
    ✓ messages include the amounts

  detectAsset
    ✓ recognizes native XLM
    ✓ recognizes USDC
    ✓ returns null for unsupported asset
    ✓ returns null when asset type does not match

  normalizeAmount
    ✓ rounds to 7 decimal places
    ✓ handles whole numbers
    ✓ handles smallest XLM unit

  extractValidPayment
    ✓ returns payOp, memo, asset for a valid transaction
    ✓ returns null for a failed transaction
    ✓ returns null when memo is missing
    ✓ returns null when memo is empty string
    ✓ returns null when no payment op to school wallet
    ✓ returns null for unsupported asset

  verifyTransaction
    ✓ returns payment details with asset info for a valid XLM transaction
    ✓ throws INVALID_DESTINATION when no matching payment op
    ✓ throws INVALID_DESTINATION when payment is to a different wallet
    ✓ throws UNSUPPORTED_ASSET for unsupported asset
    ✓ feeValidation status is unknown when student not found

  parseIncomingTransaction
    ✓ correctly extracts memo and amount from payment op

  syncPaymentsForSchool
    ✓ resolves without error when no transactions exist
    ✓ skips transaction with unmatched memo (no matching student)  ← NEW
    ✓ skips transaction with no memo field                         ← NEW
    ✓ skips transaction with empty string memo                     ← NEW
    ✓ stops pagination when a known txHash is encountered

Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

## Running Specific Tests

### Run only the new tests

```bash
npm test -- -t "skips transaction"
```

### Run with verbose output

```bash
npm test -- stellar.test.js --verbose
```

### Run with coverage

```bash
npm test -- stellar.test.js --coverage
```

## Troubleshooting

### If tests fail to run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Check Node.js version (requires Node 18+):
   ```bash
   node --version
   ```

3. Clear Jest cache:
   ```bash
   npx jest --clearCache
   ```

### If specific tests fail

1. Run with verbose output to see detailed error:
   ```bash
   npm test -- stellar.test.js --verbose
   ```

2. Check mock setup in the test file

3. Verify the stellarService implementation hasn't changed

### Common Issues

**Issue**: `Cannot find module '../backend/src/services/stellarService'`
**Solution**: Run tests from the project root directory

**Issue**: `MONGO_URI is not defined`
**Solution**: Tests set this automatically, but ensure no conflicting .env file

**Issue**: Tests timeout
**Solution**: Increase Jest timeout in package.json:
```json
{
  "jest": {
    "testTimeout": 10000
  }
}
```

## Test Coverage

These tests cover:
- ✅ Unmatched memo handling
- ✅ Missing memo handling
- ✅ Empty/whitespace memo handling
- ✅ No Payment creation for invalid transactions
- ✅ No Student updates for invalid transactions
- ✅ Graceful error handling

## What the Tests Verify

### For Unmatched Memo:
```javascript
// Given: Transaction with memo 'UNKNOWN_STUDENT_999'
// When: syncPaymentsForSchool runs
// Then: 
//   - Payment.create is NOT called
//   - Student.findOneAndUpdate is NOT called
//   - No error is thrown
```

### For No Memo:
```javascript
// Given: Transaction with memo: undefined
// When: syncPaymentsForSchool runs
// Then:
//   - Payment.create is NOT called
//   - Student.findOneAndUpdate is NOT called
//   - No error is thrown
```

### For Empty Memo:
```javascript
// Given: Transaction with memo: '   '
// When: syncPaymentsForSchool runs
// Then:
//   - Payment.create is NOT called
//   - Student.findOneAndUpdate is NOT called
//   - No error is thrown
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test

- name: Upload Coverage
  run: npm test -- --coverage --coverageReporters=lcov
```

## Next Steps

1. Run the tests locally to verify they pass
2. Commit the changes
3. Push to the test branch
4. Create a pull request
5. Ensure CI tests pass

## Documentation

- Full test documentation: `docs/testing-sync-payments.md`
- Summary: `SYNC_PAYMENTS_TESTS_SUMMARY.md`
- Test file: `tests/stellar.test.js`
