const {
  verifyTransaction,
  syncPayments,
  validatePaymentAgainstFee,
  detectAsset,
  normalizeAmount,
} = require('../backend/src/services/stellarService');

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockOperations = jest.fn();

jest.mock('../backend/src/config/stellarConfig', () => ({
  SCHOOL_WALLET: 'GTEST123',
  ACCEPTED_ASSETS: {
    XLM: { code: 'XLM', type: 'native', issuer: null },
    USDC: { code: 'USDC', type: 'credit_alphanum4', issuer: 'GISSUER' },
  },
  isAcceptedAsset: (code, type) => {
    const map = { XLM: 'native', USDC: 'credit_alphanum4' };
    if (map[code] && map[code] === type) return { accepted: true, asset: { code, type } };
    return { accepted: false, asset: null };
  },
  server: {
    transactions: () => ({
      forAccount: () => ({
        order: () => ({ limit: () => ({ call: async () => ({ records: [] }) }) }),
      }),
      transaction: (hash) => ({
        call: async () => ({
          hash,
          memo: 'STU001',
          created_at: new Date().toISOString(),
          operations: mockOperations,
        }),
      }),
    }),
  },
}));

const Payment = require('../backend/src/models/paymentModel');
const Student = require('../backend/src/models/studentModel');

jest.mock('../backend/src/models/paymentModel', () => ({
  findOne: jest.fn(),
  create: jest.fn().mockResolvedValue({}),
}));

jest.mock('../backend/src/models/studentModel', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn().mockResolvedValue({}),
}));

// ─── validatePaymentAgainstFee ────────────────────────────────────────────────

describe('validatePaymentAgainstFee', () => {
  test('valid when payment equals fee', () => {
    expect(validatePaymentAgainstFee(200, 200).status).toBe('valid');
  });

  test('underpaid when payment is less than fee', () => {
    expect(validatePaymentAgainstFee(150, 200).status).toBe('underpaid');
  });

  test('overpaid when payment exceeds fee', () => {
    expect(validatePaymentAgainstFee(250, 200).status).toBe('overpaid');
  });

  test('messages include the amounts', () => {
    expect(validatePaymentAgainstFee(50, 200).message).toContain('50');
    expect(validatePaymentAgainstFee(50, 200).message).toContain('200');
  });
});

// ─── detectAsset ─────────────────────────────────────────────────────────────

describe('detectAsset', () => {
  test('recognizes native XLM', () => {
    expect(detectAsset({ asset_type: 'native' })).toEqual({
      assetCode: 'XLM',
      assetType: 'native',
      assetIssuer: null,
    });
  });

  test('recognizes USDC', () => {
    expect(detectAsset({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GISSUER' })).toEqual({
      assetCode: 'USDC',
      assetType: 'credit_alphanum4',
      assetIssuer: 'GISSUER',
    });
  });

  test('returns null for unsupported asset', () => {
    expect(detectAsset({ asset_type: 'credit_alphanum4', asset_code: 'SHIB', asset_issuer: 'GRANDOM' })).toBeNull();
  });

  test('returns null when asset type does not match', () => {
    // XLM code but wrong type
    expect(detectAsset({ asset_type: 'credit_alphanum4', asset_code: 'XLM', asset_issuer: 'GISSUER' })).toBeNull();
  });
});

// ─── normalizeAmount ──────────────────────────────────────────────────────────

describe('normalizeAmount', () => {
  test('rounds to 7 decimal places', () => {
    expect(normalizeAmount('100.123456789')).toBe(100.1234568);
  });

  test('handles whole numbers', () => {
    expect(normalizeAmount('200')).toBe(200.0);
  });

  test('handles smallest XLM unit', () => {
    expect(normalizeAmount('0.0000001')).toBe(0.0000001);
  });
});

// ─── verifyTransaction ────────────────────────────────────────────────────────

describe('verifyTransaction', () => {
  beforeEach(() => {
    Student.findOne.mockResolvedValue({ studentId: 'STU001', feeAmount: 100 });
  });

  test('returns payment details for a valid XLM transaction', async () => {
    mockOperations.mockResolvedValue({
      records: [{ type: 'payment', to: 'GTEST123', amount: '100.0000000', asset_type: 'native' }],
    });

    const result = await verifyTransaction('abc123');
    expect(result).toMatchObject({ hash: 'abc123', memo: 'STU001', amount: 100 });
    expect(result.feeValidation.status).toBe('valid');
  });

  test('returns null when no matching payment operation exists', async () => {
    mockOperations.mockResolvedValue({ records: [] });
    const result = await verifyTransaction('abc123');
    expect(result).toBeNull();
  });

  test('returns null when payment is to a different wallet', async () => {
    mockOperations.mockResolvedValue({
      records: [{ type: 'payment', to: 'GOTHER999', amount: '100.0', asset_type: 'native' }],
    });
    const result = await verifyTransaction('abc123');
    expect(result).toBeNull();
  });

  test('feeValidation status is unknown when student not found', async () => {
    Student.findOne.mockResolvedValue(null);
    mockOperations.mockResolvedValue({
      records: [{ type: 'payment', to: 'GTEST123', amount: '100.0', asset_type: 'native' }],
    });

    const result = await verifyTransaction('abc123');
    expect(result.feeValidation.status).toBe('unknown');
  });

  test('still returns details for unsupported asset (verifyTransaction does not filter by asset)', async () => {
    // verifyTransaction does not call detectAsset — it returns details regardless of asset type.
    // Asset filtering only happens in syncPayments. This test documents that behaviour.
    mockOperations.mockResolvedValue({
      records: [{ type: 'payment', to: 'GTEST123', amount: '100.0', asset_type: 'credit_alphanum4', asset_code: 'SHIB', asset_issuer: 'GRANDOM' }],
    });
    const result = await verifyTransaction('abc123');
    expect(result).not.toBeNull();
    expect(result.amount).toBe(100);
  });
});

// ─── syncPayments ─────────────────────────────────────────────────────────────

describe('syncPayments', () => {
  test('resolves without error when no transactions exist', async () => {
    await expect(syncPayments()).resolves.toBeUndefined();
  });
});
