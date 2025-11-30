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
    if (!fromCurrency || fromCurrency === 'USD') return amount;
    return amount * (rates[fromCurrency] || 1);
  };

  return { rates, loading, convertToUSD, CURRENCIES };
}

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tickers || tickers.length === 0) return;

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const uniqueTickers = [...new Set(tickers.filter(Boolean))];
        if (uniqueTickers.length === 0) {
          setLoading(false);
          return;
        }

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the current real-time stock prices for these tickers: ${uniqueTickers.join(', ')}. Return the current market price in USD for each ticker.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              prices: {
                type: "object",
                description: "Object with ticker symbols as keys and current prices as values",
                additionalProperties: { type: "number" }
              }
            }
          }
        });
        
        if (result?.prices) {
          setPrices(result.prices);
        }
      } catch (error) {
        console.error('Failed to fetch stock prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [tickers?.join(',')]);

  return { prices, loading };
}

export function useBondPrices(bonds) {
  // For bonds, we'll estimate current value based on coupon rate and maturity
  // In practice, you'd want a bond pricing service
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bonds || bonds.length === 0) return;

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const bondInfo = bonds.map(b => ({
          name: b.name,
          type: b.bond_type,
          face_value: b.face_value,
          coupon_rate: b.coupon_rate,
          maturity_date: b.maturity_date
        }));

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Estimate current market values for these bonds based on current interest rates and market conditions: ${JSON.stringify(bondInfo)}. Consider current treasury yields and credit spreads.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              values: {
                type: "object",
                description: "Object with bond names as keys and estimated current values as values",
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
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}