export default async function getStockPrices(params, context) {
  const { tickers } = params;
  
  if (!tickers || tickers.length === 0) {
    return { prices: {} };
  }
  
  const symbols = tickers.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}`);
    }
    
    const data = await response.json();
    const prices = {};
    
    if (data?.quoteResponse?.result) {
      for (const quote of data.quoteResponse.result) {
        if (quote.regularMarketPrice) {
          prices[quote.symbol] = quote.regularMarketPrice;
        }
      }
    }
    
    return { prices };
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return { prices: {}, error: error.message };
  }
}