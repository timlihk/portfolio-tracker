// Backend API client to replace Base44 SDK
// In production, use relative URL since frontend and backend are on same server
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// Helper function to get authentication token
function getAuthToken() {
  // Try to get token from sessionStorage (preferred) or localStorage (fallback)
  const token = sessionStorage.getItem('base44_access_token') ||
                localStorage.getItem('base44_access_token') ||
                localStorage.getItem('token');
  return token;
}

// Helper to get shared secret (family/demo login)
function getSharedSecret() {
  const secret = sessionStorage.getItem('shared_secret') ||
                 localStorage.getItem('shared_secret') ||
                 localStorage.getItem('secret_phrase');
  return secret;
}

// Normalize legacy snake_case payloads to camelCase for outbound requests
function normalizePayload(body) {
  if (!body || typeof body !== 'object') return body;
  const map = {
    company_name: 'companyName',
    average_cost: 'averageCost',
    current_price: 'currentPrice',
    purchase_date: 'purchaseDate',
    bond_type: 'bondType',
    face_value: 'faceValue',
    coupon_rate: 'couponRate',
    maturity_date: 'maturityDate',
    purchase_price: 'purchasePrice',
    current_value: 'currentValue',
    fund_name: 'fundName',
    fund_type: 'fundType',
    vintage_year: 'vintageYear',
    called_capital: 'calledCapital',
    commitment_date: 'commitmentDate',
    deal_type: 'dealType',
    investment_amount: 'investmentAmount',
    ownership_percentage: 'ownershipPercentage',
    investment_date: 'investmentDate',
    ytd_return: 'ytdReturn',
    management_fee: 'managementFee',
    performance_fee: 'performanceFee',
    redemption_frequency: 'redemptionFrequency',
    lockup_end_date: 'lockupEndDate',
    deposit_type: 'depositType',
    interest_rate: 'interestRate',
    liability_type: 'liabilityType',
    outstanding_balance: 'outstandingBalance',
    rate_type: 'rateType',
    start_date: 'startDate',
    account_type: 'accountType',
    account_number: 'accountNumber',
  };
  const normalized = { ...body };
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in normalized && !(camel in normalized)) {
      normalized[camel] = normalized[snake];
      delete normalized[snake];
    }
  }
  return normalized;
}

// Helper function for API calls
/**
 * @param {string} endpoint
 * @param {Object} options
 * @param {string} [options.method]
 * @param {any} [options.headers]
 * @param {any} [options.body]
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);

  // Get authentication token if available
  const token = getAuthToken();
  const sharedSecret = getSharedSecret();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sharedSecret) {
    headers['Authorization'] = `Shared ${sharedSecret}`;
    headers['x-shared-secret'] = sharedSecret;
  }

  /** @type {{ method?: string, headers?: any, body?: any }} */
  const config = {
    headers,
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(normalizePayload(config.body));
    console.log('📦 Request body:', config.body);
  }

  try {
    const response = await fetch(url, config);
    console.log(`📥 Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', errorData);
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ API call failed:', error);
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
  updateStock: (id, stockData) => apiCall(`/portfolio/stocks/${id}`, {
    method: 'PUT',
    body: stockData,
  }),
  deleteStock: (id) => apiCall(`/portfolio/stocks/${id}`, {
    method: 'DELETE',
  }),

  // Bonds
  getBonds: () => apiCall('/portfolio/bonds'),
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
  getPEFunds: () => apiCall('/portfolio/pe-funds'),
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
  getPEDeals: () => apiCall('/portfolio/pe-deals'),
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
  getLiquidFunds: () => apiCall('/portfolio/liquid-funds'),
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
  getCashDeposits: () => apiCall('/portfolio/cash-deposits'),
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
  getLiabilities: () => apiCall('/portfolio/liabilities'),
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
    update: (id, data) => portfolioAPI.updateStock(id, data),
    delete: (id) => portfolioAPI.deleteStock(id),
  },
  Bond: {
    list: () => portfolioAPI.getBonds(),
    create: (data) => portfolioAPI.createBond(data),
    update: (id, data) => portfolioAPI.updateBond(id, data),
    delete: (id) => portfolioAPI.deleteBond(id),
  },
  PEFund: {
    list: () => portfolioAPI.getPEFunds(),
    create: (data) => portfolioAPI.createPEFund(data),
    update: (id, data) => portfolioAPI.updatePEFund(id, data),
    delete: (id) => portfolioAPI.deletePEFund(id),
  },
  PEDeal: {
    list: () => portfolioAPI.getPEDeals(),
    create: (data) => portfolioAPI.createPEDeal(data),
    update: (id, data) => portfolioAPI.updatePEDeal(id, data),
    delete: (id) => portfolioAPI.deletePEDeal(id),
  },
  LiquidFund: {
    list: () => portfolioAPI.getLiquidFunds(),
    create: (data) => portfolioAPI.createLiquidFund(data),
    update: (id, data) => portfolioAPI.updateLiquidFund(id, data),
    delete: (id) => portfolioAPI.deleteLiquidFund(id),
  },
  CashDeposit: {
    list: () => portfolioAPI.getCashDeposits(),
    create: (data) => portfolioAPI.createCashDeposit(data),
    update: (id, data) => portfolioAPI.updateCashDeposit(id, data),
    delete: (id) => portfolioAPI.deleteCashDeposit(id),
  },
  Liability: {
    list: () => portfolioAPI.getLiabilities(),
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
