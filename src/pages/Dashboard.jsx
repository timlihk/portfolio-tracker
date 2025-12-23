import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, authAPI } from '@/api/backendClient';
import StatCard from '@/components/portfolio/StatCard';
import AllocationChart from '@/components/portfolio/AllocationChart';
import AIPortfolioAnalysis from '@/components/portfolio/AIPortfolioAnalysis';
import { useExchangeRates, useStockPrices, useBondPrices } from '@/components/portfolio/useMarketData';
import { 
  TrendingUp, 
  Briefcase, 
  Building2, 
  Landmark, 
  Wallet,
  Waves,
  Banknote,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
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

  // Get exchange rates and real-time prices
  const { convertToUSD, loading: ratesLoading } = useExchangeRates();
  
  const stockTickers = useMemo(() => stocks.map(s => s.ticker).filter(Boolean), [stocks]);
  const { prices: stockPrices = {}, loading: stockPricesLoading } = useStockPrices(stockTickers);
  const { prices: bondPrices = {}, loading: bondPricesLoading } = useBondPrices(bonds);

  const isLoadingPrices = ratesLoading || stockPricesLoading || bondPricesLoading;

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
      const realTimeValue = Number(b.currentValue) || Number(bondPrices[b.name]) || Number(b.purchasePrice) || 0;
      const converted = convertToUSD(realTimeValue, b.currency);
      return sum + (isNaN(converted) ? 0 : converted);
    }, 0);
    const bondsCost = bonds.reduce((sum, b) => {
      const converted = convertToUSD(Number(b.purchasePrice) || 0, b.currency);
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

  // Prepare portfolio data for AI analysis
  const portfolioDataForAI = useMemo(() => ({
    totalValue,
    totalCost,
    totalGainPercent,
    allocation: allocationData,
    stocks: stocks.map(s => ({
      ticker: s.ticker,
      company: s.companyName,
      sector: s.sector,
      shares: s.shares,
      averageCost: s.averageCost,
      currentPrice: stockPrices[s.ticker]?.price || s.currentPrice || s.averageCost || 0,
      currency: s.currency
    })),
    bonds: bonds.map(b => ({
      name: b.name,
      type: b.bondType,
      faceValue: b.faceValue,
      couponRate: b.couponRate,
      maturityDate: b.maturityDate,
      rating: b.rating,
      currency: b.currency
    })),
    liquidFunds: liquidFunds.map(f => ({
      name: f.fundName,
      type: f.fundType,
      strategy: f.strategy,
      invested: f.investmentAmount,
      currentValue: f.currentValue,
      ytdReturn: f.ytdReturn
    })),
    peFunds: peFunds.map(f => ({
      name: f.fundName,
      type: f.fundType,
      vintage: f.vintageYear,
      commitment: f.commitment,
      called: f.calledCapital,
      nav: f.nav,
      distributions: f.distributions
    })),
    peDeals: peDeals.map(d => ({
      company: d.companyName,
      sector: d.sector,
      type: d.dealType,
      invested: d.investmentAmount,
      currentValue: d.currentValue,
      status: d.status
    }))
  }), [totalValue, totalCost, totalGainPercent, allocationData, stocks, bonds, liquidFunds, peFunds, peDeals, stockPrices]);

  // Recent activity
  const allAssets = [
    ...stocks.map(s => ({ ...s, type: 'Stock', date: s.purchaseDate })),
    ...bonds.map(b => ({ ...b, type: 'Bond', date: b.purchaseDate })),
    ...liquidFunds.map(f => ({ ...f, type: 'Liquid Fund', date: f.investmentDate })),
    ...peFunds.map(f => ({ ...f, type: 'PE Fund', date: f.commitmentDate })),
    ...peDeals.map(d => ({ ...d, type: 'PE Deal', date: d.investmentDate }))
  ].filter(a => a.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const isEmpty =
    stocks.length === 0 &&
    bonds.length === 0 &&
    peFunds.length === 0 &&
    peDeals.length === 0 &&
    liquidFunds.length === 0 &&
    cashDeposits.length === 0 &&
    liabilities.length === 0;

  const isLoadingData = profileLoading || stocksLoading || bondsLoading || peFundsLoading || peDealsLoading || liquidFundsLoading || cashLoading || liabilitiesLoading;

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
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio Overview</h1>
            <p className="text-slate-500 mt-1">Track your investments across all asset classes</p>
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

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Net Worth"
            value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Wallet}
            trend={totalCost > 0 && !isNaN(Number(totalGainPercent)) ? (Number(totalGainPercent) >= 0 ? 'up' : 'down') : null}
            trendValue={totalCost > 0 && !isNaN(Number(totalGainPercent)) ? `${totalGainPercent}%` : null}
            subValue={totalLiabilities > 0 ? `$${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} assets - $${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} liabilities` : 'all time'}
          />
          <StatCard
            title="Stocks"
            value={`$${stocksValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            trend={stocksCost > 0 && !isNaN(Number(stocksGainPercent)) ? (Number(stocksGainPercent) >= 0 ? 'up' : 'down') : null}
            trendValue={stocksCost > 0 && !isNaN(Number(stocksGainPercent)) ? `${stocksGainPercent}%` : null}
            subValue={`${stocks.length} positions`}
          />
          <StatCard
            title="Fixed Income"
            value={`$${bondsValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Landmark}
            subValue={`${bonds.length} bonds`}
          />
          <StatCard
            title="Cash & Deposits"
            value={`$${cashValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Banknote}
            subValue={`${cashDeposits.length} positions`}
          />
          {totalLiabilities > 0 && (
            <StatCard
              title="Liabilities"
              value={`-$${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={CreditCard}
              subValue={`${activeLiabilities.length} active loans`}
            />
          )}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <StatCard
            title="Liquid Funds"
            value={`$${liquidFundsValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Waves}
            trend={liquidFundsCost > 0 ? ((liquidFundsValue - liquidFundsCost) >= 0 ? 'up' : 'down') : null}
            trendValue={liquidFundsCost > 0 ? `${(((liquidFundsValue - liquidFundsCost) / liquidFundsCost) * 100).toFixed(1)}%` : null}
            subValue={`${liquidFunds.length} funds`}
          />
          <StatCard
            title="Private Equity"
            value={`$${(peFundsValue + peDealsValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Briefcase}
            subValue={`$${peFundsUnfunded.toLocaleString()} unfunded`}
          />
          <StatCard
            title="Alternative Investments"
            value={`$${(peFundsValue + peDealsValue + liquidFundsValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Building2}
            subValue={`${peFunds.length + peDeals.length + liquidFunds.length} positions`}
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationChart data={allocationData} />
          
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
            
            {allAssets.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {allAssets.map((asset, index) => (
                  <div 
                    key={`${asset.type}-${asset.id}`}
                    className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${
                        asset.type === 'Stock' ? 'bg-sky-50' :
                        asset.type === 'Bond' ? 'bg-emerald-50' :
                        asset.type === 'Liquid Fund' ? 'bg-cyan-50' :
                        asset.type === 'PE Fund' ? 'bg-violet-50' : 'bg-amber-50'
                      }`}>
                        {asset.type === 'Stock' && <TrendingUp className="w-4 h-4 text-sky-600" />}
                        {asset.type === 'Bond' && <Landmark className="w-4 h-4 text-emerald-600" />}
                        {asset.type === 'Liquid Fund' && <Waves className="w-4 h-4 text-cyan-600" />}
                        {asset.type === 'PE Fund' && <Briefcase className="w-4 h-4 text-violet-600" />}
                        {asset.type === 'PE Deal' && <Building2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {asset.ticker || asset.name || asset.fundName || asset.companyName}
                        </p>
                        <p className="text-sm text-slate-500">{asset.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        {asset.date && format(new Date(asset.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auth / data status */}
        <div className="mb-6 space-y-3">
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
              {isEmpty && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">No portfolio data found for this user.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* AI Portfolio Analysis */}
        <div className="mt-8">
          <AIPortfolioAnalysis portfolioData={portfolioDataForAI} />
        </div>

        {/* PE Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">PE Funds Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Commitment</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peFundsCommitment.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Called Capital</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peFundsCalled.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Distributions</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  ${peFunds.reduce((sum, f) => sum + (Number(f.distributions) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Current NAV</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peFunds.reduce((sum, f) => sum + (Number(f.nav) || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Direct Investments</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Invested</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peDealsCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Current Value</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peDealsValue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Active Deals</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {peDeals.filter(d => d.status === 'Active').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Unrealized Gain</p>
                <p className={`text-2xl font-semibold ${peDealsValue - peDealsCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${(peDealsValue - peDealsCost).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
