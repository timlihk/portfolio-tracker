import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, authAPI } from '@/api/backendClient';
import StatCard from '@/components/portfolio/StatCard';
import AllocationChart from '@/components/portfolio/AllocationChart';
import CurrencyExposureChart from '@/components/portfolio/CurrencyExposureChart';
import { useExchangeRates, useStockPrices, useBondPrices } from '@/components/portfolio/useMarketData';
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

export default function Dashboard() {
  const { data: profile, error: profileError, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authAPI.getProfile(),
    retry: false
  });

  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => entities.Stock.list()
  });

  const { data: bonds = [], isLoading: bondsLoading } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => entities.Bond.list()
  });

  const { data: peFunds = [], isLoading: peFundsLoading } = useQuery({
    queryKey: ['peFunds'],
    queryFn: () => entities.PEFund.list()
  });

  const { data: peDeals = [], isLoading: peDealsLoading } = useQuery({
    queryKey: ['peDeals'],
    queryFn: () => entities.PEDeal.list()
  });

  const { data: liquidFunds = [], isLoading: liquidFundsLoading } = useQuery({
    queryKey: ['liquidFunds'],
    queryFn: () => entities.LiquidFund.list()
  });

  const { data: cashDeposits = [], isLoading: cashLoading } = useQuery({
    queryKey: ['cashDeposits'],
    queryFn: () => entities.CashDeposit.list()
  });

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => entities.Liability.list()
  });
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  // Get exchange rates and real-time prices
  const { convertToUSD, loading: ratesLoading } = useExchangeRates();
  
  const stockTickers = useMemo(() => stocks.map(s => s.ticker).filter(Boolean), [stocks]);
  const { prices: stockPrices = {}, loading: stockPricesLoading } = useStockPrices(stockTickers);
  const { prices: bondPrices = {}, loading: bondPricesLoading } = useBondPrices(bonds);

  const isLoadingPrices = ratesLoading || stockPricesLoading || bondPricesLoading;

  const getBondPricePct = (bond) => {
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

  const getBondMarketValue = (bond) => {
    const face = Number(bond.faceValue) || 0;
    return face * (getBondPricePct(bond) / 100);
  };

  const getBondCost = (bond) => {
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

  const allocationData = [
    { name: 'Stocks', value: stocksValue },
    { name: 'Bonds', value: bondsValue },
    { name: 'Cash & Deposits', value: cashValue },
    { name: 'Liquid Funds', value: liquidFundsValue },
    { name: 'PE Funds', value: peFundsValue },
    { name: 'PE Deals', value: peDealsValue }
  ].filter(item => item.value > 0);

  const formatUsd = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const buildCurrencyExposure = (assetsOnly = true) => {
    const map = new Map();
    const add = (currency, amount) => {
      if (!currency || !Number.isFinite(amount)) return;
      map.set(currency, (map.get(currency) || 0) + amount);
    };
    if (assetsOnly) {
      stocks.forEach((s) => add(s.currency || 'USD', convertToUSD((Number(s.shares) || 0) * (Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0), s.currency)));
      bonds.forEach((b) => add(b.currency || 'USD', convertToUSD(getBondMarketValue(b), b.currency)));
      liquidFunds.forEach((f) => add(f.currency || 'USD', Number(f.currentValue) || Number(f.investmentAmount) || 0));
      cashDeposits.forEach((c) => add(c.currency || 'USD', convertToUSD(Number(c.amount) || 0, c.currency)));
      peFunds.forEach((f) => add('USD', Number(f.nav) || Number(f.distributions) || 0));
      peDeals.forEach((d) => add('USD', Number(d.currentValue) || Number(d.investmentAmount) || 0));
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

  const isLoadingData = profileLoading || stocksLoading || bondsLoading || peFundsLoading || peDealsLoading || liquidFundsLoading || cashLoading || liabilitiesLoading;

  if (isLoadingData || accountsLoading) {
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
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio Overview</h1>
            <p className="text-slate-500 mt-1">Net worth, allocation, and account-level view</p>
          </div>
          <div className="flex items-center gap-2">
            {isLoadingPrices && (
              <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating prices...
              </Badge>
            )}
            <Badge variant="secondary" className="py-1.5 px-3">
              All values in USD
            </Badge>
          </div>
        </div>

        {/* Top: Net worth + allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <StatCard
              title="Net Worth"
              value={formatUsd(totalValue)}
              icon={Wallet}
              trend={totalCost > 0 && !isNaN(Number(totalGainPercent)) ? (Number(totalGainPercent) >= 0 ? 'up' : 'down') : null}
              trendValue={totalCost > 0 && !isNaN(Number(totalGainPercent)) ? `${totalGainPercent}%` : null}
              subValue={`${formatUsd(totalAssets)} assets • ${formatUsd(totalLiabilities)} liabilities`}
            />
          </div>
          <div className="lg:col-span-2">
            <AllocationChart data={allocationData} />
          </div>
        </div>

        {/* Assets + Liabilities cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Assets by Class</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Stocks', value: stocksValue, count: stocks.length, icon: <TrendingUp className="w-4 h-4 text-sky-600" /> },
                { label: 'Fixed Income', value: bondsValue, count: bonds.length, icon: <Landmark className="w-4 h-4 text-emerald-600" /> },
                { label: 'Liquid Funds', value: liquidFundsValue, count: liquidFunds.length },
                { label: 'Cash & Deposits', value: cashValue, count: cashDeposits.length, icon: <Banknote className="w-4 h-4 text-amber-600" /> },
                { label: 'PE Funds', value: peFundsValue, count: peFunds.length },
                { label: 'PE Deals', value: peDealsValue, count: peDeals.length }
              ].map((item) => (
                <div key={item.label} className="border border-slate-100 rounded-xl p-4 flex flex-col gap-1 bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    {item.icon}
                  </div>
                  <p className="text-xl font-semibold text-slate-900">{formatUsd(item.value)}</p>
                  <p className="text-xs text-slate-400">{item.count || 0} positions</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Liabilities</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-semibold text-rose-600">-{formatUsd(totalLiabilities)}</p>
              </div>
              <div className="space-y-2">
                {activeLiabilities.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm text-slate-700">
                    <span className="truncate">{l.name || l.liabilityType || 'Liability'}</span>
                    <span>-{formatUsd(convertToUSD(Number(l.outstandingBalance) || 0, l.currency))}</span>
                  </div>
                ))}
                {activeLiabilities.length === 0 && (
                  <p className="text-sm text-slate-400">No active liabilities</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Currency exposure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Assets by Currency</h3>
            <AllocationChart data={buildCurrencyExposure(true)} />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Liabilities by Currency</h3>
            <AllocationChart data={buildCurrencyExposure(false)} />
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
