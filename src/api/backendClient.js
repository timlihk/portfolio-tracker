// Backend API client to replace Base44 SDK
// In production, use relative URL since frontend and backend are on same server
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');

// Helper function to get authentication token
function getAuthToken() {
  // Try to get token from sessionStorage (preferred) or localStorage (fallback)
  const token = sessionStorage.getItem('base44_access_token') ||
                localStorage.getItem('base44_access_token') ||
                localStorage.getItem('token');
  return token;
}

// Helper function for API calls
/**
 * @param {string} endpoint
 * @param {Object} options
 * @param {string} [options.method]
 * @param {any} [options.headers]
 * @param {any} [options.body]
 * @param {Record<string,string|number>} [options.params]
 * @param {boolean} [options.includePagination] include pagination headers in the response
 */
async function apiCall(endpoint, options = {}) {
  const { includePagination, ...restOptions } = options;
  const params = restOptions.params
    ? '?' + new URLSearchParams(Object.entries(restOptions.params).map(([k, v]) => [k, String(v)])).toString()
    : '';
  const url = `${API_BASE_URL}${endpoint}${params}`;

  // Get authentication token if available
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...restOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  /** @type {{ method?: string, headers?: any, body?: any }} */
  const config = {
    headers,
    ...restOptions,
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
    // Request body logged via network tools; omit noisy console logging in production
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorData = responseData || {};
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    if (includePagination) {
      const total = Number(response.headers.get('x-total-count')) || 0;
      const page = Number(response.headers.get('x-page')) || undefined;
      const limit = Number(response.headers.get('x-limit')) || undefined;
      return {
        data: responseData,
        pagination: {
          total,
          page,
          limit
        }
      };
    }

    return responseData;
  } catch (error) {
    // Retry once on network/timeout errors
    if (restOptions.__retry) throw error;
    const retryable = error?.name === 'AbortError' || (error?.message && /Network|fetch/i.test(error.message));
    if (retryable) {
      return apiCall(endpoint, { ...restOptions, includePagination, __retry: true });
    }
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
  setSharedSecret: (secret) => apiCall('/auth/shared-secret', {
    method: 'POST',
    body: { secret },
  }),
  clearSharedSecret: () => apiCall('/auth/shared-secret', {
    method: 'DELETE',
  }),
};

// Portfolio API
export const portfolioAPI = {
  getDashboard: () => apiCall('/portfolio/dashboard'),
  getInsights: () => apiCall('/portfolio/insights'),

  // Accounts
  getAccounts: (params) => apiCall('/portfolio/accounts', { params }),
  getAccountsWithPagination: (params) => apiCall('/portfolio/accounts', { params, includePagination: true }),
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
  getStocks: (params) => apiCall('/portfolio/stocks', { params }),
  getStocksWithPagination: (params) => apiCall('/portfolio/stocks', { params, includePagination: true }),
  createStock: (stockData) => apiCall('/portfolio/stocks', {
    method: 'POST',
    body: stockData,
  }),
  updateStock: (id, stockData) => apiCall(`/portfolio/stocks/${id}`, {
    method: 'PUT',
    body: stockData,
  }),
  deleteStock: (id) => apiCall(`/portfolio/stocks/${id}`, {
    method: 'DELETE',
  }),

  // Bonds
  getBonds: (params) => apiCall('/portfolio/bonds', { params }),
  getBondsWithPagination: (params) => apiCall('/portfolio/bonds', { params, includePagination: true }),
  createBond: (bondData) => apiCall('/portfolio/bonds', {
    method: 'POST',
    body: bondData,
  }),
  updateBond: (id, bondData) => apiCall(`/portfolio/bonds/${id}`, {
    method: 'PUT',
    body: bondData,
  }),
  deleteBond: (id) => apiCall(`/portfolio/bonds/${id}`, {
    method: 'DELETE',
  }),

  // PE Funds
  getPEFunds: (params) => apiCall('/portfolio/pe-funds', { params }),
  getPEFundsWithPagination: (params) => apiCall('/portfolio/pe-funds', { params, includePagination: true }),
  createPEFund: (fundData) => apiCall('/portfolio/pe-funds', {
    method: 'POST',
    body: fundData,
  }),
  updatePEFund: (id, fundData) => apiCall(`/portfolio/pe-funds/${id}`, {
    method: 'PUT',
    body: fundData,
  }),
  deletePEFund: (id) => apiCall(`/portfolio/pe-funds/${id}`, {
    method: 'DELETE',
  }),

  // PE Deals
  getPEDeals: (params) => apiCall('/portfolio/pe-deals', { params }),
  getPEDealsWithPagination: (params) => apiCall('/portfolio/pe-deals', { params, includePagination: true }),
  createPEDeal: (dealData) => apiCall('/portfolio/pe-deals', {
    method: 'POST',
    body: dealData,
  }),
  updatePEDeal: (id, dealData) => apiCall(`/portfolio/pe-deals/${id}`, {
    method: 'PUT',
    body: dealData,
  }),
  deletePEDeal: (id) => apiCall(`/portfolio/pe-deals/${id}`, {
    method: 'DELETE',
  }),

  // Liquid Funds
  getLiquidFunds: (params) => apiCall('/portfolio/liquid-funds', { params }),
  getLiquidFundsWithPagination: (params) => apiCall('/portfolio/liquid-funds', { params, includePagination: true }),
  createLiquidFund: (fundData) => apiCall('/portfolio/liquid-funds', {
    method: 'POST',
    body: fundData,
  }),
  updateLiquidFund: (id, fundData) => apiCall(`/portfolio/liquid-funds/${id}`, {
    method: 'PUT',
    body: fundData,
  }),
  deleteLiquidFund: (id) => apiCall(`/portfolio/liquid-funds/${id}`, {
    method: 'DELETE',
  }),

  // Cash Deposits
  getCashDeposits: (params) => apiCall('/portfolio/cash-deposits', { params }),
  getCashDepositsWithPagination: (params) => apiCall('/portfolio/cash-deposits', { params, includePagination: true }),
  createCashDeposit: (depositData) => apiCall('/portfolio/cash-deposits', {
    method: 'POST',
    body: depositData,
  }),
  updateCashDeposit: (id, depositData) => apiCall(`/portfolio/cash-deposits/${id}`, {
    method: 'PUT',
    body: depositData,
  }),
  deleteCashDeposit: (id) => apiCall(`/portfolio/cash-deposits/${id}`, {
    method: 'DELETE',
  }),

  // Liabilities
  getLiabilities: (params) => apiCall('/portfolio/liabilities', { params }),
  getLiabilitiesWithPagination: (params) => apiCall('/portfolio/liabilities', { params, includePagination: true }),
  createLiability: (liabilityData) => apiCall('/portfolio/liabilities', {
    method: 'POST',
    body: liabilityData,
  }),
  updateLiability: (id, liabilityData) => apiCall(`/portfolio/liabilities/${id}`, {
    method: 'PUT',
    body: liabilityData,
  }),
  deleteLiability: (id) => apiCall(`/portfolio/liabilities/${id}`, {
    method: 'DELETE',
  }),

  // Insights
  getInsights: () => apiCall('/portfolio/insights'),
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

  // Get bond price by ISIN (percent of par)
  getBondPriceByIsin: (isin) => apiCall(`/pricing/bond/${encodeURIComponent(isin)}`),
};

// Mock entities to maintain compatibility with existing code
export const entities = {
  Account: {
    list: (params) => portfolioAPI.getAccounts(params),
    listWithPagination: (params) => portfolioAPI.getAccountsWithPagination(params),
    create: (data) => portfolioAPI.createAccount(data),
    update: (id, data) => portfolioAPI.updateAccount(id, data),
    delete: (id) => portfolioAPI.deleteAccount(id),
  },
  Stock: {
    list: (params) => portfolioAPI.getStocks(params),
    listWithPagination: (params) => portfolioAPI.getStocksWithPagination(params),
    create: (data) => portfolioAPI.createStock(data),
    update: (id, data) => portfolioAPI.updateStock(id, data),
    delete: (id) => portfolioAPI.deleteStock(id),
  },
  Bond: {
    list: (params) => portfolioAPI.getBonds(params),
    listWithPagination: (params) => portfolioAPI.getBondsWithPagination(params),
    create: (data) => portfolioAPI.createBond(data),
    update: (id, data) => portfolioAPI.updateBond(id, data),
    delete: (id) => portfolioAPI.deleteBond(id),
  },
  PEFund: {
    list: (params) => portfolioAPI.getPEFunds(params),
    listWithPagination: (params) => portfolioAPI.getPEFundsWithPagination(params),
    create: (data) => portfolioAPI.createPEFund(data),
    update: (id, data) => portfolioAPI.updatePEFund(id, data),
    delete: (id) => portfolioAPI.deletePEFund(id),
  },
  PEDeal: {
    list: (params) => portfolioAPI.getPEDeals(params),
    listWithPagination: (params) => portfolioAPI.getPEDealsWithPagination(params),
    create: (data) => portfolioAPI.createPEDeal(data),
    update: (id, data) => portfolioAPI.updatePEDeal(id, data),
    delete: (id) => portfolioAPI.deletePEDeal(id),
  },
  LiquidFund: {
    list: (params) => portfolioAPI.getLiquidFunds(params),
    listWithPagination: (params) => portfolioAPI.getLiquidFundsWithPagination(params),
    create: (data) => portfolioAPI.createLiquidFund(data),
    update: (id, data) => portfolioAPI.updateLiquidFund(id, data),
    delete: (id) => portfolioAPI.deleteLiquidFund(id),
  },
  CashDeposit: {
    list: (params) => portfolioAPI.getCashDeposits(params),
    listWithPagination: (params) => portfolioAPI.getCashDepositsWithPagination(params),
    create: (data) => portfolioAPI.createCashDeposit(data),
    update: (id, data) => portfolioAPI.updateCashDeposit(id, data),
    delete: (id) => portfolioAPI.deleteCashDeposit(id),
  },
  Liability: {
    list: (params) => portfolioAPI.getLiabilities(params),
    listWithPagination: (params) => portfolioAPI.getLiabilitiesWithPagination(params),
    create: (data) => portfolioAPI.createLiability(data),
    update: (id, data) => portfolioAPI.updateLiability(id, data),
    delete: (id) => portfolioAPI.deleteLiability(id),
  },
};

// Export main client object for compatibility
export const backend = {
  entities,
  auth: authAPI,
  pricing: pricingAPI,
};
