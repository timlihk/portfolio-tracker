import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

export function useExchangeRates() {
  const [rates, setRates] = useState({ USD: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the current exchange rates to USD for: EUR, GBP, CHF, JPY, CAD, AUD, ILS. Return accurate real-time rates.`,
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
              ILS: { type: "number", description: "ILS to USD rate" }
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
          ILS: 0.27
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

  useEffect(() => {
    if (!tickers || tickers.length === 0) {
      setPrices({});
      return;
    }

    const uniqueTickers = [...new Set(tickers.filter(Boolean))];
    if (uniqueTickers.length === 0) {
      setPrices({});
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Look up the current stock price for these ticker symbols: ${uniqueTickers.join(', ')}

Search Yahoo Finance or Google Finance for each ticker and return the latest trading price.
Return the exact ticker symbol as the key (matching what I provided).`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              prices: {
                type: "object",
                description: "Object mapping ticker symbols to their current stock prices as numbers"
              }
            },
            required: ["prices"]
          }
        });
        
        if (result && result.prices && typeof result.prices === 'object') {
          setPrices(result.prices);
        }
      } catch (error) {
        console.error('Failed to fetch stock prices:', error);
        setPrices({});
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [JSON.stringify(tickers)]);

  return { prices: prices || {}, loading };
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
  ILS: '₪'
};

export function formatCurrency(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}