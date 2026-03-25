/**
 * Amount Normalizer Examples
 * 
 * This file demonstrates how to use the amountNormalizer module
 * in a typical Stellar transaction flow.
 * 
 * Run with: node src/examples/amountNormalizerExamples.js
 */

const {
    // Core conversion functions
    toBaseUnit,
    fromBaseUnit,
    
    // Arithmetic functions
    addAmounts,
    subtractAmounts,
    multiplyAmount,
    divideAmounts,
    compareAmounts,
    
    // Formatting and parsing
    formatAmount,
    parseAmount,
    roundAmount,
    getPrecision,
    
    // Validation
    validateAmount,
    isValidRange,
    
    // Utility
    getAssetConfig,
    getMaxAmount,
    getMinAmount,
    toBigInt,
    fromBigInt,
    
    // Error handling
    AmountNormalizationError,
    ErrorCodes
} = require('../utils/amountNormalizer');

console.log('='.repeat(60));
console.log('STELLAR AMOUNT NORMALIZER EXAMPLES');
console.log('='.repeat(60));

// ============================================================================
// EXAMPLE 1: Basic XLM Conversion
// ============================================================================
console.log('\n--- Example 1: Basic XLM Conversion ---\n');

// Convert display amount (XLM) to base unit (stroops)
const xlmAmount = '10.5';
const stroops = toBaseUnit(xlmAmount);
console.log(`Display amount: ${xlmAmount} XLM`);
console.log(`Base unit: ${stroops} stroops`);

// Convert back from base unit to display
const backToXLM = fromBaseUnit(stroops);
console.log(`Converted back: ${backToXLM} XLM`);

// ============================================================================
// EXAMPLE 2: Handling Decimal Precision
// ============================================================================
console.log('\n--- Example 2: Decimal Precision Handling ---\n');

const preciseAmounts = [
    '0.0000001',  // Minimum valid XLM
    '0.1234567',  // 7 decimal places
    '1.0000001',  // More than 7 decimals
    '100000000'   // Maximum integer stroops
];

preciseAmounts.forEach(amount => {
    try {
        const baseUnit = toBaseUnit(amount);
        console.log(`${amount.padEnd(15)} XLM → ${baseUnit.padEnd(15)} stroops`);
    } catch (error) {
        console.log(`${amount.padEnd(15)} XLM → ERROR: ${error.message}`);
    }
});

// ============================================================================
// EXAMPLE 3: Validation
// ============================================================================
console.log('\n--- Example 3: Input Validation ---\n');

const testAmounts = [
    { value: '100', shouldPass: true },
    { value: '0', shouldPass: true },
    { value: '-10', shouldPass: false },
    { value: 'abc', shouldPass: false },
    { value: '', shouldPass: false },
    { value: '1000000000000000000', shouldPass: false },  // Exceeds max
    { value: '0.00000001', shouldPass: false },  // Below min
    { value: '10.12345678', shouldPass: false },  // Too many decimals
];

testAmounts.forEach(({ value, shouldPass }) => {
    const result = validateAmount(value);
    const status = result.isValid === shouldPass ? '✓' : '✗';
    console.log(`${status} "${value}" - ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
        console.log(`   Error: ${result.error.message}`);
    }
});

// ============================================================================
// EXAMPLE 4: Arithmetic Operations
// ============================================================================
console.log('\n--- Example 4: Arithmetic Operations ---\n');

const amount1 = '100.5';
const amount2 = '50.25';

console.log(`Amount 1: ${amount1} XLM`);
console.log(`Amount 2: ${amount2} XLM`);
console.log(`Sum: ${addAmounts(amount1, amount2)} XLM`);
console.log(`Difference: ${subtractAmounts(amount1, amount2)} XLM`);
console.log(`Product (x2): ${multiplyAmount(amount1, '2')} XLM`);
console.log(`Quotient (÷2): ${divideAmounts(amount1, '2')} XLM`);

// Compare amounts
console.log(`\nComparisons:`);
console.log(`100.5 > 50.25? ${compareAmounts('100.5', '50.25') === 1}`);
console.log(`50.25 < 100.5? ${compareAmounts('50.25', '100.5') === -1}`);
console.log(`100 = 100? ${compareAmounts('100', '100') === 0}`);

// ============================================================================
// EXAMPLE 5: Multiple Assets
// ============================================================================
console.log('\n--- Example 5: Multiple Asset Support ---\n');

const assets = ['XLM', 'USDC', 'EURT'];

assets.forEach(assetCode => {
    const config = getAssetConfig(assetCode);
    console.log(`${assetCode}:`);
    console.log(`  - 1 ${assetCode} = 10^${config.decimals} ${config.baseUnit}s`);
    console.log(`  - Min: ${getMinAmount(assetCode)} ${assetCode}`);
    console.log(`  - Max: ${getMaxAmount(assetCode)} ${assetCode}`);
    
    // Convert 1 unit of each asset
    const baseUnit = toBaseUnit('1', { assetCode });
    console.log(`  - 1 ${assetCode} = ${baseUnit} ${config.baseUnit}s`);
    console.log('');
});

// ============================================================================
// EXAMPLE 6: Transaction Flow Example
// ============================================================================
console.log('\n--- Example 6: Transaction Flow ---\n');

/**
 * Simulates a payment processing flow
 */
async function processPayment(paymentData) {
    const { fromAccount, toAccount, amount, assetCode = 'XLM' } = paymentData;
    
    console.log(`Processing payment from ${fromAccount} to ${toAccount}`);
    console.log(`Amount: ${amount} ${assetCode}`);
    
    try {
        // Step 1: Validate the amount
        const validation = validateAmount(amount, { assetCode });
        if (!validation.isValid) {
            throw new AmountNormalizationError(
                `Invalid amount: ${validation.error.message}`,
                validation.error.code,
                validation.error
            );
        }
        console.log('✓ Amount validated');
        
        // Step 2: Convert to base unit for Stellar
        const baseUnitAmount = toBaseUnit(amount, { assetCode });
        console.log(`✓ Converted to ${baseUnitAmount} ${getAssetConfig(assetCode).baseUnit}s`);
        
        // Step 3: Check balance (simulated)
        const balance = '500';  // Simulated balance
        if (compareAmounts(amount, balance) > 0) {
            throw new Error('Insufficient balance');
        }
        console.log('✓ Balance check passed');
        
        // Step 4: Build the transaction (simplified)
        const transaction = {
            source: fromAccount,
            destination: toAccount,
            asset: assetCode === 'XLM' ? 'native' : `${assetCode}:${getAssetConfig(assetCode).issuer}`,
            amount: baseUnitAmount,  // Integer base unit
            fee: '100',  // Base fee in stroops
            createdAt: new Date().toISOString()
        };
        console.log(`✓ Transaction built:`, JSON.stringify(transaction, null, 2));
        
        // Step 5: Store in database (base unit as string/integer)
        const databaseRecord = {
            fromAccount,
            toAccount,
            amountBaseUnit: baseUnitAmount,  // Store as integer string
            assetCode,
            decimals: getAssetConfig(assetCode).decimals,
            status: 'pending'
        };
        console.log(`✓ Database record:`, JSON.stringify(databaseRecord, null, 2));
        
        // Step 6: Convert for display
        const displayAmount = fromBaseUnit(baseUnitAmount, { assetCode });
        console.log(`✓ Display amount: ${displayAmount} ${assetCode}`);
        
        return {
            success: true,
            transaction,
            databaseRecord,
            displayAmount
        };
        
    } catch (error) {
        console.error(`✗ Payment failed: ${error.message}`);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Run the payment flow example
const paymentResult = processPayment({
    fromAccount: 'GABCD...123',
    toAccount: 'GXYZA...456',
    amount: '150.75',
    assetCode: 'XLM'
});

console.log('\nPayment result:', paymentResult.success ? 'SUCCESS' : 'FAILED');

// ============================================================================
// EXAMPLE 7: Fee Calculation
// ============================================================================
console.log('\n--- Example 7: Fee Calculation ---\n');

const paymentAmount = '100';
const feePercentage = 0.5;  // 0.5%

console.log(`Payment amount: ${paymentAmount} XLM`);
console.log(`Fee percentage: ${feePercentage}%`);

const feeAmount = multiplyAmount(paymentAmount, feePercentage / 100);
console.log(`Fee amount: ${feeAmount} XLM`);

const totalAmount = addAmounts(paymentAmount, feeAmount);
console.log(`Total amount: ${totalAmount} XLM`);

const feeInStroops = toBaseUnit(feeAmount);
console.log(`Fee in stroops: ${feeInStroops}`);

// ============================================================================
// EXAMPLE 8: Parsing Various Input Formats
// ============================================================================
console.log('\n--- Example 8: Parsing Various Formats ---\n');

const inputs = [
    '100',
    '$100.50',
    '100,000.50',
    '100.1234567',
    100.50,
    '€50.25'
];

inputs.forEach(input => {
    try {
        const parsed = parseAmount(input);
        console.log(`"${input}" → ${parsed} XLM`);
    } catch (error) {
        console.log(`"${input}" → ERROR: ${error.message}`);
    }
});

// ============================================================================
// EXAMPLE 9: BigInt for Database Storage
// ============================================================================
console.log('\n--- Example 9: BigInt for Database Storage ---\n');

const displayAmount = '123.4567890';
console.log(`Display amount: ${displayAmount} XLM`);

// Convert to BigInt for storage
const bigIntAmount = toBigInt(displayAmount);
console.log(`BigInt for storage: ${bigIntAmount}`);

// Convert back from BigInt
const restoredAmount = fromBigInt(bigIntAmount);
console.log(`Restored from BigInt: ${restoredAmount} XLM`);

// ============================================================================
// EXAMPLE 10: Error Handling
// ============================================================================
console.log('\n--- Example 10: Error Handling ---\n');

const invalidInputs = ['-100', 'abc', '', '999999999999999999999'];

invalidInputs.forEach(input => {
    try {
        toBaseUnit(input);
    } catch (error) {
        console.log(`Input: "${input}"`);
        console.log(`  Error Code: ${error.code}`);
        console.log(`  Message: ${error.message}`);
        if (error.details) {
            console.log(`  Details:`, error.details);
        }
        console.log('');
    }
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLES COMPLETE');
console.log('='.repeat(60));
console.log(`
Key Takeaways:

1. Always use toBaseUnit() before sending to Stellar network
2. Store amounts as integer strings in the database
3. Use fromBaseUnit() only when displaying to users
4. Decimal.js ensures no floating-point errors
5. Validate ALL user inputs before processing
6. Handle errors gracefully with proper error codes
`);
