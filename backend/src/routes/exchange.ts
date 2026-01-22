import { Router, Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Simple in-memory cache for exchange rates (1 hour TTL)
interface CachedRate {
  rate: number;
  timestamp: number;
}
const rateCache = new Map<string, CachedRate>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches exchange rate from open.er-api.com
 * Free API, no key required, but rate limited
 */
async function fetchExchangeRate(from: string, to: string): Promise<number> {
  const cacheKey = `${from}-${to}`;
  const cached = rateCache.get(cacheKey);

  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json() as { result: string; rates: Record<string, number> };

    if (data.result !== 'success' || !data.rates?.[to]) {
      throw new Error(`Could not find rate for ${from} to ${to}`);
    }

    const rate = data.rates[to];

    // Cache the result
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return rate;
  } catch (error) {
    // If we have a stale cached value, return it as fallback
    if (cached) {
      return cached.rate;
    }
    throw error;
  }
}

/**
 * GET /api/exchange-rate
 * Get exchange rate for currency conversion
 *
 * Query params:
 * - from: Source currency code (e.g., EUR)
 * - to: Target currency code (default: CZK)
 *
 * Response: { from: 'EUR', to: 'CZK', rate: 25.12 }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const from = (req.query.from as string || '').toUpperCase();
    const to = (req.query.to as string || 'CZK').toUpperCase();

    if (!from) {
      throw new BadRequestError('Missing required parameter: from (source currency code)');
    }

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      throw new BadRequestError('Currency codes must be 3-letter ISO codes (e.g., EUR, CZK)');
    }

    // Same currency = rate of 1
    if (from === to) {
      res.json({ from, to, rate: 1 });
      return;
    }

    const rate = await fetchExchangeRate(from, to);

    res.json({ from, to, rate });
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
      return;
    }
    // Wrap external API errors
    next(new Error(`Failed to fetch exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
});

/**
 * POST /api/exchange-rate/batch
 * Get exchange rates for multiple currencies at once
 *
 * Body: { currencies: ['EUR', 'USD'], to: 'CZK' }
 * Response: { rates: { EUR: 25.12, USD: 23.45 }, to: 'CZK' }
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currencies, to = 'CZK' } = req.body;

    if (!Array.isArray(currencies) || currencies.length === 0) {
      throw new BadRequestError('currencies must be a non-empty array of currency codes');
    }

    const targetCurrency = to.toUpperCase();
    const rates: Record<string, number> = {};

    for (const currency of currencies) {
      const code = currency.toUpperCase();
      if (code === targetCurrency) {
        rates[code] = 1;
      } else {
        rates[code] = await fetchExchangeRate(code, targetCurrency);
      }
    }

    res.json({ rates, to: targetCurrency });
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
      return;
    }
    next(new Error(`Failed to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
});

export default router;
