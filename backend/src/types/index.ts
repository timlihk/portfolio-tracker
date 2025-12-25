import type { Request } from 'express';
import type {
  User as PrismaUser,
  Stock as PrismaStock,
  Bond as PrismaBond,
  PeFund as PrismaPeFund,
  PeDeal as PrismaPeDeal,
  LiquidFund as PrismaLiquidFund,
  CashDeposit as PrismaCashDeposit,
  Liability as PrismaLiability,
  Account as PrismaAccount,
  Prisma
} from '@prisma/client';

// Re-export Prisma types
export type {
  PrismaUser,
  PrismaStock,
  PrismaBond,
  PrismaPeFund,
  PrismaPeDeal,
  PrismaLiquidFund,
  PrismaCashDeposit,
  PrismaLiability,
  PrismaAccount
};

// Decimal type helper for JSON serialization
export type DecimalToNumber<T> = {
  [K in keyof T]: T[K] extends Prisma.Decimal | null ? number | null : T[K];
};

// API Response types (with Decimal converted to number)
export interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stock {
  id: number;
  userId: number;
  ticker: string;
  companyName: string | null;
  sector: string | null;
  shares: number | null;
  averageCost: number | null;
  currentPrice: number | null;
  currency: string | null;
  account: string | null;
  purchaseDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Bond {
  id: number;
  userId: number;
  name: string;
  isin: string | null;
  bondType: string | null;
  faceValue: number | null;
  couponRate: number | null;
  maturityDate: Date | null;
  rating: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  currency: string | null;
  account: string | null;
  purchaseDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface PeFund {
  id: number;
  userId: number;
  fundName: string;
  manager: string | null;
  fundType: string | null;
  vintageYear: number | null;
  commitment: number | null;
  calledCapital: number | null;
  nav: number | null;
  distributions: number | null;
  commitmentDate: Date | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface PeDeal {
  id: number;
  userId: number;
  companyName: string;
  sector: string | null;
  dealType: string | null;
  investmentAmount: number | null;
  currentValue: number | null;
  ownershipPercentage: number | null;
  sponsor: string | null;
  status: string | null;
  investmentDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface LiquidFund {
  id: number;
  userId: number;
  fundName: string;
  manager: string | null;
  fundType: string | null;
  strategy: string | null;
  investmentAmount: number | null;
  currentValue: number | null;
  ytdReturn: number | null;
  managementFee: number | null;
  performanceFee: number | null;
  currency: string | null;
  redemptionFrequency: string | null;
  lockupEndDate: Date | null;
  investmentDate: Date | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CashDeposit {
  id: number;
  userId: number;
  name: string;
  depositType: string | null;
  amount: number | null;
  currency: string | null;
  interestRate: number | null;
  maturityDate: Date | null;
  account: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Liability {
  id: number;
  userId: number;
  name: string;
  liabilityType: string | null;
  account: string | null;
  principal: number | null;
  outstandingBalance: number | null;
  interestRate: number | null;
  rateType: string | null;
  collateral: string | null;
  startDate: Date | null;
  maturityDate: Date | null;
  currency: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Account {
  id: number;
  userId: number;
  name: string;
  institution: string | null;
  accountType: string | null;
  accountNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Request types
export interface CreateStockRequest {
  ticker: string;
  companyName?: string;
  sector?: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  currency?: string;
  account?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface UpdateStockRequest extends Partial<CreateStockRequest> {}

export interface CreateBondRequest {
  name: string;
  isin?: string;
  bondType?: string;
  faceValue?: number;
  couponRate?: number;
  maturityDate?: string;
  rating?: string;
  purchasePrice?: number;
  currentValue?: number;
  currency?: string;
  account?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface UpdateBondRequest extends Partial<CreateBondRequest> {}

export interface CreatePeFundRequest {
  fundName: string;
  manager?: string;
  fundType?: string;
  vintageYear?: number;
  commitment?: number;
  calledCapital?: number;
  nav?: number;
  distributions?: number;
  commitmentDate?: string;
  status?: string;
  notes?: string;
}

export interface UpdatePeFundRequest extends Partial<CreatePeFundRequest> {}

export interface CreatePeDealRequest {
  companyName: string;
  sector?: string;
  dealType?: string;
  investmentAmount?: number;
  currentValue?: number;
  ownershipPercentage?: number;
  sponsor?: string;
  status?: string;
  investmentDate?: string;
  notes?: string;
}

export interface UpdatePeDealRequest extends Partial<CreatePeDealRequest> {}

export interface CreateLiquidFundRequest {
  fundName: string;
  manager?: string;
  fundType?: string;
  strategy?: string;
  investmentAmount?: number;
  currentValue?: number;
  ytdReturn?: number;
  managementFee?: number;
  performanceFee?: number;
  currency?: string;
  redemptionFrequency?: string;
  lockupEndDate?: string;
  investmentDate?: string;
  status?: string;
  notes?: string;
}

export interface UpdateLiquidFundRequest extends Partial<CreateLiquidFundRequest> {}

export interface CreateCashDepositRequest {
  name: string;
  depositType?: string;
  amount?: number;
  currency?: string;
  interestRate?: number;
  maturityDate?: string;
  account?: string;
  notes?: string;
}

export interface UpdateCashDepositRequest extends Partial<CreateCashDepositRequest> {}

export interface CreateLiabilityRequest {
  name: string;
  liabilityType?: string;
  account?: string;
  principal?: number;
  outstandingBalance?: number;
  interestRate?: number;
  rateType?: string;
  collateral?: string;
  startDate?: string;
  maturityDate?: string;
  currency?: string;
  status?: string;
  notes?: string;
}

export interface UpdateLiabilityRequest extends Partial<CreateLiabilityRequest> {}

export interface CreateAccountRequest {
  name: string;
  institution?: string;
  accountType?: string;
  accountNumber?: string;
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name?: string;
}

export interface AuthResponse {
  message: string;
  user: Pick<User, 'id' | 'email' | 'name'>;
  token: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

// Extended Request with userId
export interface AuthRequest extends Request {
  userId?: number;
}

// Pricing types
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

// Dashboard types
export interface PortfolioDashboard {
  stocks: Stock[];
  bonds: Bond[];
  peFunds: PeFund[];
  peDeals: PeDeal[];
  liquidFunds: LiquidFund[];
  cashDeposits: CashDeposit[];
  liabilities: Liability[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// Utility type to convert Prisma Decimal to number for API responses
export function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value.toNumber();
}

// Helper to serialize a Prisma model with Decimals to JSON-safe object
export function serializeDecimals<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key in result) {
    const value = result[key];
    if (value && typeof value === 'object' && 'toNumber' in value) {
      result[key] = (value as Prisma.Decimal).toNumber();
    }
  }
  return result as T;
}
