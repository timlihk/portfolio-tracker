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
          prompt: `Get the current exchange rates to USD for: EUR, GBP, CHF, JPY, CAD, AUD, ILS, HKD. Return accurate real-time rates.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              EUR: { type: "number", description: "EUR to USD rate" },
              GBP: { type: "number", description: "GBP to USD rate" },
              CHF: { type: "number", description: "CHF to USD rate" },
              JPY: { type: "number", description: "JPY to USD rate" },
              CAD: { type: "number", description: "CAD to USD rate" },
              AUD: { type: "number", description: "AUD to USD rate" },
              ILS: { type: "number", description: "ILS to USD rate" },
              HKD: { type: "number", description: "HKD to USD rate" }
            }
          }
        });
        setRates({ USD: 1, ...result });
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates
        setRates({
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
        // Make individual requests for each ticker to improve accuracy
        const tickerList = uniqueTickers.join(', ');
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `I need the CURRENT stock prices for these specific ticker symbols: ${tickerList}

CRITICAL INSTRUCTIONS:
1. Search Yahoo Finance, Google Finance, or MarketWatch for EACH ticker
2. Return the LATEST market price (today's price or most recent closing price)
3. Use the EXACT ticker symbols as keys: ${uniqueTickers.map(t => `"${t}"`).join(', ')}
4. Every ticker MUST have a price - search carefully for each one
5. Prices should be in the stock's native currency

Return format example:
{"prices": {"AAPL": 189.95, "MSFT": 378.91}}

Tickers to look up: ${tickerList}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              prices: {
                type: "object",
                description: "Map of exact ticker symbol to current stock price as a number",
                additionalProperties: { type: "number" }
              }
            },
            required: ["prices"]
          }
        });
        
        console.log('Stock price response:', result);
        
        if (result && result.prices && typeof result.prices === 'object') {
          // Validate all values are numbers
          const validPrices = {};
          for (const [ticker, price] of Object.entries(result.prices)) {
            const numPrice = Number(price);
            if (!isNaN(numPrice) && numPrice > 0) {
              // Match ticker case-insensitively but store with original case
              const matchedTicker = uniqueTickers.find(t => t.toUpperCase() === ticker.toUpperCase()) || ticker;
              validPrices[matchedTicker] = numPrice;
            }
          }
          console.log('Valid prices:', validPrices);
          setPrices(validPrices);
        }
      } catch (err) {
        console.error('Failed to fetch stock prices:', err);
        setError(err);
        // Don't clear prices on error - keep last known values
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