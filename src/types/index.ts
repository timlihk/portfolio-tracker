// Entity Types
export interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Stock {
  id: number;
  userId: number;
  ticker: string;
  companyName: string | null;
  company_name?: string | null; // Legacy field name
  sector: string | null;
  shares: number | null;
  averageCost: number | null;
  average_cost?: number | null; // Legacy field name
  currentPrice: number | null;
  current_price?: number | null; // Legacy field name
  currency: string | null;
  account: string | null;
  purchaseDate: Date | string | null;
  purchase_date?: Date | string | null; // Legacy field name
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Bond {
  id: number;
  userId: number;
  name: string;
  isin: string | null;
  bondType: string | null;
  bond_type?: string | null;
  faceValue: number | null;
  face_value?: number | null;
  couponRate: number | null;
  coupon_rate?: number | null;
  maturityDate: Date | string | null;
  maturity_date?: Date | string | null;
  rating: string | null;
  purchasePrice: number | null;
  purchase_price?: number | null;
  currentValue: number | null;
  current_value?: number | null;
  currency: string | null;
  account: string | null;
  purchaseDate: Date | string | null;
  purchase_date?: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PeFund {
  id: number;
  userId: number;
  fundName: string;
  fund_name?: string;
  manager: string | null;
  fundType: string | null;
  fund_type?: string | null;
  vintageYear: number | null;
  vintage_year?: number | null;
  commitment: number | null;
  calledCapital: number | null;
  called_capital?: number | null;
  nav: number | null;
  distributions: number | null;
  commitmentDate: Date | string | null;
  commitment_date?: Date | string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PeDeal {
  id: number;
  userId: number;
  companyName: string;
  company_name?: string;
  sector: string | null;
  dealType: string | null;
  deal_type?: string | null;
  investmentAmount: number | null;
  investment_amount?: number | null;
  currentValue: number | null;
  current_value?: number | null;
  ownershipPercentage: number | null;
  ownership_percentage?: number | null;
  sponsor: string | null;
  status: string | null;
  investmentDate: Date | string | null;
  investment_date?: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LiquidFund {
  id: number;
  userId: number;
  fundName: string;
  fund_name?: string;
  manager: string | null;
  fundType: string | null;
  fund_type?: string | null;
  strategy: string | null;
  investmentAmount: number | null;
  investment_amount?: number | null;
  currentValue: number | null;
  current_value?: number | null;
  ytdReturn: number | null;
  ytd_return?: number | null;
  managementFee: number | null;
  management_fee?: number | null;
  performanceFee: number | null;
  performance_fee?: number | null;
  redemptionFrequency: string | null;
  redemption_frequency?: string | null;
  lockupEndDate: Date | string | null;
  lockup_end_date?: Date | string | null;
  investmentDate: Date | string | null;
  investment_date?: Date | string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CashDeposit {
  id: number;
  userId: number;
  name: string;
  depositType: string | null;
  deposit_type?: string | null;
  amount: number | null;
  currency: string | null;
  interestRate: number | null;
  interest_rate?: number | null;
  maturityDate: Date | string | null;
  maturity_date?: Date | string | null;
  account: string | null;
  accountName: string | null;
  account_name?: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Liability {
  id: number;
  userId: number;
  name: string;
  liabilityType: string | null;
  liability_type?: string | null;
  account: string | null;
  principal: number | null;
  outstandingBalance: number | null;
  outstanding_balance?: number | null;
  interestRate: number | null;
  interest_rate?: number | null;
  rateType: string | null;
  rate_type?: string | null;
  collateral: string | null;
  startDate: Date | string | null;
  start_date?: Date | string | null;
  maturityDate: Date | string | null;
  maturity_date?: Date | string | null;
  currency: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Account {
  id: number;
  userId: number;
  name: string;
  institution: string | null;
  accountType: string | null;
  account_type?: string | null;
  accountNumber: string | null;
  account_number?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Auth Types
export interface AuthResponse {
  message: string;
  user: Pick<User, 'id' | 'email' | 'name'>;
  token: string;
}

// Pricing Types
export interface StockPriceData {
  ticker: string;
  price: number;
  currency: string;
  name: string;
  shortName: string;
  sector: string | null;
  industry: string | null;
  exchange: string;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketState?: string;
  cached: boolean;
  timestamp: number;
  convertedPrice?: number;
  convertedCurrency?: string;
  exchangeRate?: number;
}

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount?: number;
  usdAmount?: number;
  targetCurrency?: string;
  exchangeRate: number;
  fallback?: boolean;
  timestamp: number;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fallback?: boolean;
  timestamp: number;
}

// Dashboard Types
export interface PortfolioDashboard {
  stocks: Stock[];
  bonds: Bond[];
  peFunds: PeFund[];
  peDeals: PeDeal[];
  liquidFunds: LiquidFund[];
  cashDeposits: CashDeposit[];
  liabilities: Liability[];
}

// Component Props Types
export interface Column<T = unknown> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  allowCustom?: boolean;
  step?: string;
}

// Hook Return Types
export interface UseExchangeRatesReturn {
  rates: Record<string, number>;
  loading: boolean;
  convertToUSD: (amount: number, fromCurrency: string) => number;
  CURRENCIES: string[];
}

export interface UseStockPricesReturn {
  prices: Record<string, StockPriceData>;
  loading: boolean;
  error: Error | null;
  getPrice: (ticker: string) => number | null;
  getPriceData: (ticker: string) => StockPriceData | null;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface MultipleStockPricesResponse {
  results: Record<string, StockPriceData>;
  errors?: Record<string, string>;
  count: number;
  timestamp: number;
}
