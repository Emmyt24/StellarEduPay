# Fiat Currency Conversion Feature

## Overview
This feature displays approximate USD equivalents alongside XLM amounts throughout the application, helping parents understand the real-world value of cryptocurrency fees.

## Implementation

### Core Service: `currencyService.js`
- Fetches XLM/USD rates from CoinGecko public API
- Implements 5-minute client-side caching to minimize API calls
- Gracefully degrades when API is unavailable (returns stale cache or null)
- No API key required

### Custom Hook: `useFiatConversion.js`
- React hook that wraps the currency service
- Automatically fetches conversion when XLM amount changes
- Returns `{usd, rate, loading}` for easy component integration
- Handles cleanup to prevent memory leaks

### Components Updated

#### PaymentForm.jsx
- Displays fee as "250 XLM (~$XX.XX USD)"
- Shows exchange rate and disclaimer below fee amount
- Uses `useFiatConversion` hook for automatic updates

#### VerifyPayment.jsx
- Shows fiat equivalent for verified transaction amounts
- Includes disclaimer about approximate rates
- Only converts XLM amounts (not USDC)

#### dashboard.jsx
- Displays total XLM collected with USD equivalent
- Shows as "~$X,XXX USD" below the XLM amount
- Updates automatically when summary refreshes

## Usage Example

```javascript
import { useFiatConversion } from '../hooks/useFiatConversion';

function MyComponent() {
  const xlmAmount = 250;
  const { usd, rate, loading } = useFiatConversion(xlmAmount);

  return (
    <div>
      {xlmAmount} XLM
      {usd && <span>(~${usd.toFixed(2)} USD)</span>}
    </div>
  );
}
```

## Cache Behavior
- Cache duration: 5 minutes
- Stale cache served on API failure
- Cache shared across all components
- Automatic refresh after expiry

## API Details
- Endpoint: `https://api.coingecko.com/api/v3/simple/price`
- Parameters: `ids=stellar&vs_currencies=usd`
- Rate limit: CoinGecko free tier (50 calls/minute)
- Timeout: 8 seconds

## Disclaimer
All fiat conversions include a disclaimer:
> "Exchange rates are indicative and may vary. Actual value depends on market conditions."

This ensures users understand the displayed values are approximate and subject to market fluctuations.

## Testing
Unit tests are available in `frontend/src/services/__tests__/currencyService.test.js` covering:
- Price fetching and caching
- Cache expiry and refresh
- Error handling and stale cache fallback
- Conversion calculations
