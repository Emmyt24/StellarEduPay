import { generateStellarPaymentUri } from '../stellarUri';

describe('generateStellarPaymentUri', () => {
  test('generates basic XLM payment URI', () => {
    const uri = generateStellarPaymentUri({
      destination: 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      amount: 10.5,
      memo: 'STU1023',
      memoType: 'text',
    });

    expect(uri).toContain('web+stellar:pay?');
    expect(uri).toContain('destination=GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(uri).toContain('amount=10.5');
    expect(uri).toContain('memo=STU1023');
    expect(uri).toContain('memo_type=TEXT');
  });

  test('generates URI without memo', () => {
    const uri = generateStellarPaymentUri({
      destination: 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      amount: 5,
    });

    expect(uri).toContain('web+stellar:pay?');
    expect(uri).toContain('destination=GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(uri).toContain('amount=5');
    expect(uri).not.toContain('memo=');
  });

  test('throws error when destination is missing', () => {
    expect(() => {
      generateStellarPaymentUri({
        amount: 10,
        memo: 'test',
      });
    }).toThrow('Destination wallet address is required');
  });

  test('throws error when amount is invalid', () => {
    expect(() => {
      generateStellarPaymentUri({
        destination: 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        amount: 0,
        memo: 'test',
      });
    }).toThrow('Valid payment amount is required');
  });

  test('includes asset code and issuer for non-native assets', () => {
    const uri = generateStellarPaymentUri({
      destination: 'GAXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      amount: 100,
      memo: 'STU1023',
      assetCode: 'USDC',
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    });

    expect(uri).toContain('asset_code=USDC');
    expect(uri).toContain('asset_issuer=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  });
});
