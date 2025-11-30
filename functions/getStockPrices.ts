export default async function getStockPrices(params, context) {
  const { tickers } = params;
  
  if (!tickers || tickers.length === 0) {
    return { prices: {} };
  }
  
  const prices = {};
  
  // Use Yahoo Finance scraper endpoint which is more reliable
  const symbols = tickers.join(',');
  
  try {
    // Try the spark API endpoint (simpler, more reliable)
    const url = `https://query2.finance.yahoo.com/v6/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://finance.yahoo.com',
        'Referer': 'https://finance.yahoo.com/'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.quoteResponse?.result) {
        for (const quote of data.quoteResponse.result) {
          if (quote.regularMarketPrice) {
            prices[quote.symbol] = quote.regularMarketPrice;
          }
        }
      }
    } else {
      // Fallback: try individual chart endpoints
      for (const ticker of tickers) {
        try {
          const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
          const chartResponse = await fetch(chartUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            const price = chartData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price) {
              prices[ticker] = price;
            }
          }
        } catch (e) {
          // Skip failed ticker
        }
      }
    }
  } catch (e) {
    console.error('Yahoo Finance fetch error:', e);
  }
  
  return { prices };
}