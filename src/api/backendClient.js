// Backend API client to replace Base44 SDK
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Authentication API
export const authAPI = {
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: userData,
  }),

  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: credentials,
  }),

  getProfile: () => apiCall('/auth/profile'),
};

// Portfolio API
export const portfolioAPI = {
  getDashboard: () => apiCall('/portfolio/dashboard'),

  // Accounts
  getAccounts: () => apiCall('/portfolio/accounts'),
  createAccount: (accountData) => apiCall('/portfolio/accounts', {
    method: 'POST',
    body: accountData,
  }),
  updateAccount: (id, accountData) => apiCall(`/portfolio/accounts/${id}`, {
    method: 'PUT',
    body: accountData,
  }),
  deleteAccount: (id) => apiCall(`/portfolio/accounts/${id}`, {
    method: 'DELETE',
  }),

  // Stocks
  getStocks: () => apiCall('/portfolio/stocks'),
  createStock: (stockData) => apiCall('/portfolio/stocks', {
    method: 'POST',
    body: stockData,
  }),

  // Bonds
  getBonds: () => apiCall('/portfolio/bonds'),
  createBond: (bondData) => apiCall('/portfolio/bonds', {
    method: 'POST',
    body: bondData,
  }),

  // PE Funds
  getPEFunds: () => apiCall('/portfolio/pe-funds'),
  createPEFund: (fundData) => apiCall('/portfolio/pe-funds', {
    method: 'POST',
    body: fundData,
  }),

  // PE Deals
  getPEDeals: () => apiCall('/portfolio/pe-deals'),
  createPEDeal: (dealData) => apiCall('/portfolio/pe-deals', {
    method: 'POST',
    body: dealData,
  }),

  // Liquid Funds
  getLiquidFunds: () => apiCall('/portfolio/liquid-funds'),
  createLiquidFund: (fundData) => apiCall('/portfolio/liquid-funds', {
    method: 'POST',
    body: fundData,
  }),

  // Cash Deposits
  getCashDeposits: () => apiCall('/portfolio/cash-deposits'),
  createCashDeposit: (depositData) => apiCall('/portfolio/cash-deposits', {
    method: 'POST',
    body: depositData,
  }),

  // Liabilities
  getLiabilities: () => apiCall('/portfolio/liabilities'),
  createLiability: (liabilityData) => apiCall('/portfolio/liabilities', {
    method: 'POST',
    body: liabilityData,
  }),
};

// Pricing API
export const pricingAPI = {
  // Get single stock price
  getStockPrice: (ticker, convertTo = null) => {
    const params = convertTo ? `?convertTo=${convertTo}` : '';
    return apiCall(`/pricing/stock/${ticker}${params}`);
  },

  // Get multiple stock prices
  getMultipleStockPrices: (tickers, convertTo = null) => apiCall('/pricing/stocks', {
    method: 'POST',
    body: { tickers, convertTo },
  }),

  // Validate ticker symbol
  validateTicker: (ticker) => apiCall(`/pricing/validate/${ticker}`),

  // Currency conversion
  convertCurrency: (amount, from, to) =>
    apiCall(`/pricing/currency/convert?amount=${amount}&from=${from}&to=${to}`),

  // Convert to USD
  convertToUSD: (amount, from) =>
    apiCall(`/pricing/currency/to-usd?amount=${amount}&from=${from}`),

  // Get exchange rates
  getExchangeRates: (base = 'USD') => apiCall(`/pricing/currency/rates/${base}`),

  // Get supported currencies
  getSupportedCurrencies: () => apiCall('/pricing/currency/supported'),

  // Cache management
  getCacheStats: () => apiCall('/pricing/cache/stats'),
  clearCache: () => apiCall('/pricing/cache/clear', { method: 'POST' }),
};

// Mock entities to maintain compatibility with existing code
export const entities = {
  Account: {
    list: () => portfolioAPI.getAccounts(),
    create: (data) => portfolioAPI.createAccount(data),
    update: (id, data) => portfolioAPI.updateAccount(id, data),
    delete: (id) => portfolioAPI.deleteAccount(id),
  },
  Stock: {
    list: () => portfolioAPI.getStocks(),
    create: (data) => portfolioAPI.createStock(data),
  },
  Bond: {
    list: () => portfolioAPI.getBonds(),
    create: (data) => portfolioAPI.createBond(data),
  },
  PEFund: {
    list: () => portfolioAPI.getPEFunds(),
    create: (data) => portfolioAPI.createPEFund(data),
  },
  PEDeal: {
    list: () => portfolioAPI.getPEDeals(),
    create: (data) => portfolioAPI.createPEDeal(data),
  },
  LiquidFund: {
    list: () => portfolioAPI.getLiquidFunds(),
    create: (data) => portfolioAPI.createLiquidFund(data),
  },
  CashDeposit: {
    list: () => portfolioAPI.getCashDeposits(),
    create: (data) => portfolioAPI.createCashDeposit(data),
  },
  Liability: {
    list: () => portfolioAPI.getLiabilities(),
    create: (data) => portfolioAPI.createLiability(data),
  },
};

// Export main client object for compatibility
export const backend = {
  entities,
  auth: authAPI,
  pricing: pricingAPI,
};