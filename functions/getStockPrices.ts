export default async function getStockPrices(params, context) {
  const { tickers } = params;
  
  if (!tickers || tickers.length === 0) {
    return { prices: {} };
  }
  
  const prices = {};
  
  // Fetch prices one by one using Yahoo Finance chart API
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
          prices[ticker] = price;
        }
      }
    } catch (e) {
      // Skip failed ticker
    }
  }
  
  return { prices };
}