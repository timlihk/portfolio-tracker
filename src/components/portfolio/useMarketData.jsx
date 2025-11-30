import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD'];

export function useExchangeRates() {
  const [rates, setRates] = useState({
    USD: 1,
    EUR: 1.05,
    GBP: 1.27,
    CHF: 1.13,
    JPY: 0.0067,
    CAD: 0.74,
    AUD: 0.65,
    ILS: 0.27,
    HKD: 0.13
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the current exchange rates showing how much 1 unit of each currency equals in USD.

For example:
- 1 EUR = ~1.05 USD
- 1 GBP = ~1.27 USD  
- 1 JPY = ~0.0066 USD (since 1 USD = ~150 JPY, then 1 JPY = 1/150 = 0.0066 USD)
- 1 ILS = ~0.27 USD

Return the rate for: EUR, GBP, CHF, JPY, CAD, AUD, ILS, HKD
Each rate should be: how many USD you get for 1 unit of that currency.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              EUR: { type: "number", description: "How many USD for 1 EUR (e.g., 1.05)" },
              GBP: { type: "number", description: "How many USD for 1 GBP (e.g., 1.27)" },
              CHF: { type: "number", description: "How many USD for 1 CHF (e.g., 1.13)" },
              JPY: { type: "number", description: "How many USD for 1 JPY (e.g., 0.0066)" },
              CAD: { type: "number", description: "How many USD for 1 CAD (e.g., 0.74)" },
              AUD: { type: "number", description: "How many USD for 1 AUD (e.g., 0.65)" },
              ILS: { type: "number", description: "How many USD for 1 ILS (e.g., 0.27)" },
              HKD: { type: "number", description: "How many USD for 1 HKD (e.g., 0.13)" }
            }
          }
        });
        // Validate rates - JPY should be a small number like 0.006-0.007
        const validatedRates = { USD: 1 };
        for (const [currency, rate] of Object.entries(result)) {
          const numRate = Number(rate);
          // Sanity check: JPY rate should be < 0.02, others should be < 3
          if (currency === 'JPY' && numRate > 0.02) {
            // LLM probably returned inverted rate, fix it
            validatedRates[currency] = 1 / numRate;
          } else if (currency !== 'JPY' && numRate > 200) {
            // LLM probably returned inverted rate for other currencies
            validatedRates[currency] = 1 / numRate;
          } else {
            validatedRates[currency] = numRate;
          }
        }
        setRates(validatedRates);
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates (Nov 2025 approximate)
        setRates({
          USD: 1,
          EUR: 1.05,
          GBP: 1.27,
          CHF: 1.13,
          JPY: 0.0066,
          CAD: 0.71,
          AUD: 0.65,
          ILS: 0.27,
          HKD: 0.128
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const convertToUSD = (amount, fromCurrency) => {
    const num = Number(amount) || 0;
    if (!fromCurrency || fromCurrency === 'USD') return num;
    const rate = Number(rates[fromCurrency]) || 1;
    return num * rate;
  };

  return { rates, loading, convertToUSD, CURRENCIES };
}

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tickers || tickers.length === 0) {
      setPrices({});
      return;
    }

    const uniqueTickers = [...new Set(tickers.filter(t => t && typeof t === 'string' && t.trim()))];
    if (uniqueTickers.length === 0) {
      setPrices({});
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use LLM with web access to get current stock prices
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the current stock prices for these tickers: ${uniqueTickers.join(', ')}. Return ONLY the current market price in USD for each ticker.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              prices: {
                type: "object",
                description: "Object with ticker symbols as keys and current prices as numbers",
                additionalProperties: { type: "number" }
              }
            }
          }
        });
        
        const fetchedPrices = {};
        if (result?.prices) {
          for (const [ticker, price] of Object.entries(result.prices)) {
            const numPrice = Number(price);
            if (!isNaN(numPrice) && numPrice > 0) {
              const matchedTicker = uniqueTickers.find(t => t.toUpperCase() === ticker.toUpperCase()) || ticker;
              fetchedPrices[matchedTicker] = numPrice;
            }
          }
        }
        
        console.log('Stock prices from LLM:', fetchedPrices);
        setPrices(fetchedPrices);
      } catch (err) {
        console.error('Failed to fetch stock prices:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [JSON.stringify(tickers)]);

  return { prices: prices || {}, loading, error };
}

export function useBondPrices(bonds) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bonds || bonds.length === 0) return;

    const fetchPrices = async () => {
      setLoading(true);
      try {
        // Separate bonds with ISIN from those without
        const bondsWithISIN = bonds.filter(b => b.isin);
        const bondsWithoutISIN = bonds.filter(b => !b.isin);
        
        const bondInfo = bonds.map(b => ({
          name: b.name,
          isin: b.isin || null,
          type: b.bond_type,
          face_value: b.face_value,
          coupon_rate: b.coupon_rate,
          maturity_date: b.maturity_date,
          rating: b.rating
        }));

        // Use OpenFIGI for ISIN lookups and web search for pricing
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get current market values for these bonds. For bonds with ISIN, look up pricing data using the ISIN. For others, estimate based on coupon rate, maturity, and current interest rates.

Bonds: ${JSON.stringify(bondInfo)}

Use current treasury yields and credit spreads for estimation. Return values as percentage of face value (e.g., 98.5 means 98.5% of face value).`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              values: {
                type: "object",
                description: "Object with bond names as keys and current market values (in currency amount, not percentage) as values",
                additionalProperties: { type: "number" }
              }
            }
          }
        });

        if (result?.values) {
          setPrices(result.values);
        }
      } catch (error) {
        console.error('Failed to fetch bond prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [bonds?.map(b => b.id).join(',')]);

  return { prices, loading };
}

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF ',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  ILS: '₪',
  HKD: 'HK$'
};

export function formatCurrency(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}