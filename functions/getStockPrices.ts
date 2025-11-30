export default async function getStockPrices(params, context) {
  const { tickers } = params;
  
  if (!tickers || tickers.length === 0) {
    return { prices: {} };
  }
  
  const prices = {};
  
  // Fetch each ticker individually using Yahoo Finance chart API (more reliable)
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
          prices[ticker] = price;
        }
      }
    } catch (e) {
      console.log(`Failed to fetch ${ticker}:`, e.message);
    }
  }
  
  return { prices };
}