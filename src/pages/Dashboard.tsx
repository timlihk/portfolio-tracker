// @ts-nocheck
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI, portfolioAPI } from '@/api/backendClient';
import StatCard from '@/components/portfolio/StatCard';
import { useExchangeRates, useStockPrices, useBondPrices } from '@/components/portfolio/useMarketData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  TrendingUp,
  Landmark,
  Wallet,
  Banknote,
  RefreshCw,
  CreditCard,
  Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Stock, Bond, PeFund, PeDeal, LiquidFund, CashDeposit, Liability, Account, User } from '@/types';

const COLORS = ['#0ea5e9', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];

type DashboardData = {
  stocks: Stock[];
  bonds: Bond[];
  peFunds: PeFund[];
  peDeals: PeDeal[];
  liquidFunds: LiquidFund[];
  cashDeposits: CashDeposit[];
  liabilities: Liability[];
  accounts: Account[];
};

const emptyDashboard: DashboardData = {
  stocks: [],
  bonds: [],
  peFunds: [],
  peDeals: [],
  liquidFunds: [],
  cashDeposits: [],
  liabilities: [],
  accounts: []
};

export default function Dashboard() {
  const { data: profile, error: profileError, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['profile'],
    queryFn: () => authAPI.getProfile(),
    retry: false
  });

  const { data: dashboardData = emptyDashboard, isLoading: dashboardLoading, isError: dashboardError, error: dashboardErrorObj } = useQuery<DashboardData>({
    queryKey: ['portfolio-dashboard'],
    queryFn: () => portfolioAPI.getDashboard()
  });

  const stocks = dashboardData.stocks || [];
  const bonds = dashboardData.bonds || [];
  const peFunds = dashboardData.peFunds || [];
  const peDeals = dashboardData.peDeals || [];
  const liquidFunds = dashboardData.liquidFunds || [];
  const cashDeposits = dashboardData.cashDeposits || [];
  const liabilities = dashboardData.liabilities || [];
  const accounts = dashboardData.accounts || [];

  // Get exchange rates and real-time prices
  const { convertToUSD = (v: number) => v, loading: ratesLoading = false } = useExchangeRates() || {};
  
  const stockTickers = useMemo(() => stocks.map(s => s.ticker).filter(Boolean), [stocks]);
  const { prices: stockPrices = {}, loading: stockPricesLoading } = useStockPrices(stockTickers, { refreshIntervalMs: 60000 });
  const { prices: bondPrices = {}, loading: bondPricesLoading } = useBondPrices(bonds);

  const isLoadingPrices = ratesLoading || stockPricesLoading || bondPricesLoading;

  const getBondPricePct = (bond: Bond): number => {
    const manual = Number(bond.currentValue);
    const priceEntry = bondPrices[bond.id] || bondPrices[bond.isin] || bondPrices[bond.name];
    const purchasePct = Number(bond.purchasePrice);
    if (Number.isFinite(manual)) return manual;
    if (priceEntry && typeof priceEntry === 'object' && Number.isFinite(priceEntry.pricePct)) {
      return Number(priceEntry.pricePct);
    }
    if (priceEntry != null && Number.isFinite(Number(priceEntry))) {
      return Number(priceEntry);
    }
    if (Number.isFinite(purchasePct)) return purchasePct;
    return 100;
  };

  const getBondMarketValue = (bond: Bond): number => {
    const face = Number(bond.faceValue) || 0;
    return face * (getBondPricePct(bond) / 100);
  };

  const getBondCost = (bond: Bond): number => {
    const face = Number(bond.faceValue) || 0;
    const purchasePct = Number(bond.purchasePrice) || 0;
    return face * (purchasePct / 100);
  };

  const totals = useMemo(() => {
    const stocksValue = stocks.reduce((sum, s) => {
      const realTimePrice = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0;
      const shares = Number(s.shares) || 0;
      const valueInOriginalCurrency = shares * realTimePrice;
      const converted = convertToUSD(valueInOriginalCurrency, s.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const stocksCost = stocks.reduce((sum, s) => {
      const shares = Number(s.shares) || 0;
      const avgCost = Number(s.averageCost) || 0;
      const costInOriginalCurrency = shares * avgCost;
      const converted = convertToUSD(costInOriginalCurrency, s.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const bondsValue = bonds.reduce((sum, b) => {
      const value = getBondMarketValue(b);
      const converted = convertToUSD(value, b.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const bondsCost = bonds.reduce((sum, b) => {
      const cost = getBondCost(b);
      const converted = convertToUSD(cost, b.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const peFundsValue = peFunds.reduce((sum, f) => sum + (Number(f.nav) || 0) + (Number(f.distributions) || 0), 0);
    const peFundsCalled = peFunds.reduce((sum, f) => sum + (Number(f.calledCapital) || 0), 0);
    const peFundsCommitment = peFunds.reduce((sum, f) => sum + (Number(f.commitment) || 0), 0);
    const peFundsUnfunded = peFundsCommitment - peFundsCalled;
    const peDealsValue = peDeals.reduce((sum, d) => sum + (Number(d.currentValue) || Number(d.investmentAmount) || 0), 0);
    const peDealsCost = peDeals.reduce((sum, d) => sum + (Number(d.investmentAmount) || 0), 0);
    const liquidFundsValue = liquidFunds.reduce((sum, f) => sum + (Number(f.currentValue) || Number(f.investmentAmount) || 0), 0);
    const liquidFundsCost = liquidFunds.reduce((sum, f) => sum + (Number(f.investmentAmount) || 0), 0);
    const cashValue = cashDeposits.reduce((sum, c) => {
      const converted = convertToUSD(Number(c.amount) || 0, c.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const activeLiabilities = liabilities.filter(l => l.status !== 'Paid Off');
    const totalLiabilities = activeLiabilities.reduce((sum, l) => {
      const converted = convertToUSD(Number(l.outstandingBalance) || 0, l.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const totalAssets = stocksValue + bondsValue + peFundsValue + peDealsValue + liquidFundsValue + cashValue;
    const totalValue = totalAssets - totalLiabilities;
    const totalCost = stocksCost + bondsCost + peFundsCalled + peDealsCost + liquidFundsCost + cashValue - totalLiabilities;
    const totalGain = totalValue - totalCost;
    const stocksGain = stocksValue - stocksCost;
    const stocksGainPercent = stocksCost > 0 ? ((stocksGain / stocksCost) * 100).toFixed(1) : '0.0';
    const totalGainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) : '0.0';

    return {
      stocksValue,
      stocksCost,
      stocksGainPercent,
      bondsValue,
      bondsCost,
      peFundsValue,
      peFundsCalled,
      peFundsCommitment,
      peFundsUnfunded,
      peDealsValue,
      peDealsCost,
      liquidFundsValue,
      liquidFundsCost,
      cashValue,
      activeLiabilities,
      totalLiabilities,
      totalAssets,
      totalValue,
      totalCost,
      totalGainPercent
    };
  }, [stocks, bonds, peFunds, peDeals, liquidFunds, cashDeposits, liabilities, stockPrices, bondPrices, convertToUSD]);

  const {
    stocksValue,
    stocksCost,
    stocksGainPercent,
    bondsValue,
    bondsCost,
    peFundsValue,
    peFundsCalled,
    peFundsCommitment,
    peFundsUnfunded,
    peDealsValue,
    peDealsCost,
    liquidFundsValue,
    liquidFundsCost,
    cashValue,
    activeLiabilities,
    totalLiabilities,
    totalAssets,
    totalValue,
    totalCost,
    totalGainPercent
  } = totals;

  // Classify liquid funds into equity-like vs fixed-income-like
  const classifyLiquidFunds = (fund) => {
    const type = (fund.fundType || '').toLowerCase();
    const strategy = (fund.strategy || '').toLowerCase();
    const isEquity =
      type.includes('equity') ||
      strategy.includes('equity') ||
      strategy.includes('long/short');
    const isFixed =
      type.includes('bond') ||
      type.includes('fixed') ||
      strategy.includes('credit') ||
      strategy.includes('fixed');
    if (isEquity) return 'equity';
    if (isFixed) return 'fixed';
    return 'fixed'; // default bucket to avoid dropping value
  };

  const equityLiquidValue = liquidFunds.reduce((sum, f) => {
    if (classifyLiquidFunds(f) !== 'equity') return sum;
    return sum + (Number(f.currentValue) || Number(f.investmentAmount) || 0);
  }, 0);
  const fixedLiquidValue = liquidFundsValue - equityLiquidValue;
  const stocksDisplayValue = stocksValue + equityLiquidValue;
  const fixedIncomeDisplayValue = bondsValue + fixedLiquidValue;

  const allocationData = [
    { name: 'Stocks', value: stocksDisplayValue },
    { name: 'Fixed Income', value: fixedIncomeDisplayValue },
    { name: 'Cash & Deposits', value: cashValue },
    { name: 'PE Funds', value: peFundsValue },
    { name: 'PE Deals', value: peDealsValue }
  ].filter(item => item.value > 0);

  const formatUsd = (v: number) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const buildCurrencyExposure = (assetsOnly = true) => {
    const map = new Map();
    const add = (currency: string, amount: number) => {
      if (!currency || !Number.isFinite(amount)) return;
      map.set(currency, (map.get(currency) || 0) + amount);
    };
    if (assetsOnly) {
      stocks.forEach((s) => add(s.currency || 'USD', convertToUSD((Number(s.shares) || 0) * (Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0), s.currency)));
      bonds.forEach((b) => add(b.currency || 'USD', convertToUSD(getBondMarketValue(b), b.currency)));
      liquidFunds.forEach((f) => add(f.currency || 'USD', convertToUSD(Number(f.currentValue) || Number(f.investmentAmount) || 0, f.currency)));
      cashDeposits.forEach((c) => add(c.currency || 'USD', convertToUSD(Number(c.amount) || 0, c.currency)));
      peFunds.forEach((f) => add(f.currency || 'USD', convertToUSD((Number(f.nav) || 0) + (Number(f.distributions) || 0), f.currency)));
      peDeals.forEach((d) => add(d.currency || 'USD', convertToUSD(Number(d.currentValue) || Number(d.investmentAmount) || 0, d.currency)));
    } else {
      liabilities.forEach((l) => add(l.currency || 'USD', convertToUSD(Number(l.outstandingBalance) || 0, l.currency)));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  };

  const accountSummaries = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    return accounts.map((account) => {
      const accountName = account.name;
      const stocksVal = stocks.reduce((sum, s) => {
        if (s.account !== accountName) return sum;
        const price = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0;
        const value = (Number(s.shares) || 0) * price;
        return sum + convertToUSD(value, s.currency);
      }, 0);
      const bondsVal = bonds.reduce((sum, b) => {
        if (b.account !== accountName) return sum;
        const value = getBondMarketValue(b);
        return sum + convertToUSD(value, b.currency);
      }, 0);
      const cashVal = cashDeposits.reduce((sum, c) => {
        if (c.account !== accountName) return sum;
        return sum + convertToUSD(Number(c.amount) || 0, c.currency);
      }, 0);
      const liquidVal = liquidFunds.reduce((sum, f) => {
        if (f.account !== accountName) return sum;
        return sum + (Number(f.currentValue) || Number(f.investmentAmount) || 0);
      }, 0);
      const liabilitiesVal = liabilities.reduce((sum, l) => {
        if (l.account !== accountName || l.status === 'Paid Off') return sum;
        return sum + convertToUSD(Number(l.outstandingBalance) || 0, l.currency);
      }, 0);

      const assetsTotal = stocksVal + bondsVal + cashVal + liquidVal;
      const netWorth = assetsTotal - liabilitiesVal;

      return {
        name: accountName,
        assetsTotal,
        netWorth,
        liabilitiesVal,
        breakdown: {
          stocksVal,
          bondsVal,
          cashVal,
          liquidVal
        }
      };
    }).sort((a, b) => b.assetsTotal - a.assetsTotal);
  }, [accounts, stocks, bonds, cashDeposits, liquidFunds, liabilities, convertToUSD, stockPrices, bondPrices]);

  const isLoadingData = profileLoading || dashboardLoading;
  const loadError = dashboardError
    ? (dashboardErrorObj?.message || 'Failed to load dashboard data')
    : profileError
      ? (profileError as Error).message || 'Failed to load profile'
      : '';

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400 font-semibold">Portfolio</p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-slate-500 mt-1">A concise look at your wealth, allocation, and accounts</p>
          </div>
          <div className="flex items-center gap-2">
            {isLoadingPrices && (
              <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3 bg-white/70 backdrop-blur">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating prices...
              </Badge>
            )}
            <Badge variant="secondary" className="py-1.5 px-3 bg-slate-900 text-white shadow-sm">
              All values in USD
            </Badge>
          </div>
        </div>
        {loadError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {/* Hero Net Worth */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Net Worth</p>
              <p className="text-4xl md:text-5xl font-semibold">{formatUsd(totalValue)}</p>
              <p className="text-slate-300 text-sm">
                {formatUsd(totalAssets)} assets • {formatUsd(totalLiabilities)} liabilities
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <StatCard
                title="Stocks"
                value={formatUsd(stocksDisplayValue)}
                icon={Wallet}
                trend={stocksCost > 0 && !isNaN(Number(stocksGainPercent)) ? (Number(stocksGainPercent) >= 0 ? 'up' : 'down') : null}
                trendValue={stocksCost > 0 && !isNaN(Number(stocksGainPercent)) ? `${stocksGainPercent}%` : null}
                subValue={`${stocks.length} positions (+ equity funds)`}
              />
              <StatCard
                title="Cash & Deposits"
                value={formatUsd(cashValue)}
                icon={Banknote}
                subValue={`${cashDeposits.length} positions`}
              />
              <StatCard
                title="Fixed Income"
                value={formatUsd(fixedIncomeDisplayValue)}
                icon={Landmark}
                subValue={`${bonds.length} bonds + fixed-income funds`}
              />
              <StatCard
                title="Alt / PE"
                value={formatUsd(peFundsValue + peDealsValue)}
                icon={Building2}
                subValue={`${peFunds.length + peDeals.length} positions`}
              />
            </div>
          </div>
        </div>

        {/* Allocation + currency exposure */}
        <div className="bg-white/90 backdrop-blur rounded-3xl p-6 border border-slate-100 shadow-lg mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Allocation & Currency</h3>
              <p className="text-sm text-slate-500">Hover to view category and percentage</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { label: 'Asset Allocation', data: allocationData },
              { label: 'Assets by Currency', data: buildCurrencyExposure(true) },
              { label: 'Liabilities by Currency', data: buildCurrencyExposure(false) }
            ].map(({ label, data }) => {
              const hasData = data && data.length > 0;
              const total = data?.reduce((s, d) => s + d.value, 0) || 1;
              return (
                <div key={label} className="col-span-1 flex flex-col gap-3">
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <div className="w-full h-64 bg-slate-50/60 rounded-2xl border border-slate-100 flex items-center justify-center">
                    {hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            dataKey="value"
                          >
                            {data.map((entry, i) => (
                              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                const pct = ((item.value / total) * 100).toFixed(1);
                                return (
                                  <div className="bg-white px-3 py-2 rounded-lg shadow border border-slate-100 text-sm">
                                    <div className="font-medium text-slate-900">{item.name}</div>
                                    <div className="text-slate-600">{pct}% • ${Number(item.value || 0).toLocaleString()}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-sm text-slate-400">No data</span>
                    )}
                  </div>
                  {hasData && (
                    <div className="space-y-1.5 bg-slate-50/70 rounded-xl border border-slate-100 p-3">
                      {data.map((item, i) => {
                        const pct = ((item.value / total) * 100).toFixed(1);
                        return (
                          <div key={item.name} className="flex items-center justify-between text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <span className="font-medium">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* By Account view */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">By Account</h3>
            <Badge variant="outline" className="text-slate-600">
              {accountSummaries.length} accounts
            </Badge>
          </div>
          {accountSummaries.length === 0 ? (
            <p className="text-sm text-slate-500">No accounts found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountSummaries.map((acc) => (
                <div key={acc.name} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-900">{acc.name}</p>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 mb-2">Net Worth</p>
                  <p className="text-xl font-semibold text-slate-900 mb-3">{formatUsd(acc.netWorth)}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Stocks</span>
                      <span>{formatUsd(acc.breakdown.stocksVal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bonds</span>
                      <span>{formatUsd(acc.breakdown.bondsVal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cash</span>
                      <span>{formatUsd(acc.breakdown.cashVal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Liquid</span>
                      <span>{formatUsd(acc.breakdown.liquidVal)}</span>
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-rose-600">Liabilities</span>
                      <span className="text-rose-600">-{formatUsd(acc.liabilitiesVal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth status */}
        <div className="mt-6 space-y-3">
          {profileLoading && (
            <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              Checking access…
            </div>
          )}
          {profileError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 shadow-sm">
              Not authenticated. Please go to Login, enter the secret phrase, and refresh.
            </div>
          )}
          {profile && (
            <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
              <span className="font-medium">Signed in as</span>
              <span className="text-slate-900">{profile.email || `User #${profile.id}`}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">User ID: {profile.id}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
