import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list()
  });

  const { data: bonds = [] } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => base44.entities.Bond.list()
  });

  const { data: peFunds = [] } = useQuery({
    queryKey: ['peFunds'],
    queryFn: () => base44.entities.PEFund.list()
  });

  const { data: peDeals = [] } = useQuery({
    queryKey: ['peDeals'],
    queryFn: () => base44.entities.PEDeal.list()
  });

  const { data: liquidFunds = [] } = useQuery({
    queryKey: ['liquidFunds'],
    queryFn: () => base44.entities.LiquidFund.list()
  });

  // Get exchange rates and real-time prices
  const { convertToUSD, loading: ratesLoading } = useExchangeRates();
  
  const stockTickers = useMemo(() => stocks.map(s => s.ticker), [stocks]);
  const { prices: stockPrices, loading: stockPricesLoading } = useStockPrices(stockTickers);
  const { prices: bondPrices, loading: bondPricesLoading } = useBondPrices(bonds);

  const isLoadingPrices = ratesLoading || stockPricesLoading || bondPricesLoading;

  // Calculate totals with real-time prices and currency conversion
  const stocksValue = stocks.reduce((sum, s) => {
    const realTimePrice = stockPrices[s.ticker] || s.current_price || s.average_cost;
    const valueInOriginalCurrency = s.shares * realTimePrice;
    return sum + convertToUSD(valueInOriginalCurrency, s.currency);
  }, 0);
  const stocksCost = stocks.reduce((sum, s) => {
    const costInOriginalCurrency = s.shares * s.average_cost;
    return sum + convertToUSD(costInOriginalCurrency, s.currency);
  }, 0);
  const stocksGain = stocksValue - stocksCost;
  const stocksGainPercent = stocksCost > 0 ? ((stocksGain / stocksCost) * 100).toFixed(1) : 0;

  const bondsValue = bonds.reduce((sum, b) => {
    const realTimeValue = bondPrices[b.name] || b.current_value || b.purchase_price;
    return sum + convertToUSD(realTimeValue, b.currency);
  }, 0);
  const bondsCost = bonds.reduce((sum, b) => sum + convertToUSD(b.purchase_price, b.currency), 0);

  const peFundsValue = peFunds.reduce((sum, f) => sum + (f.nav || 0) + (f.distributions || 0), 0);
  const peFundsCalled = peFunds.reduce((sum, f) => sum + (f.called_capital || 0), 0);
  const peFundsCommitment = peFunds.reduce((sum, f) => sum + f.commitment, 0);
  const peFundsUnfunded = peFundsCommitment - peFundsCalled;

  const peDealsValue = peDeals.reduce((sum, d) => sum + (d.current_value || d.investment_amount), 0);
  const peDealsCost = peDeals.reduce((sum, d) => sum + d.investment_amount, 0);

  const liquidFundsValue = liquidFunds.reduce((sum, f) => sum + (f.current_value || f.investment_amount), 0);
  const liquidFundsCost = liquidFunds.reduce((sum, f) => sum + f.investment_amount, 0);

  const totalValue = stocksValue + bondsValue + peFundsValue + peDealsValue + liquidFundsValue;
  const totalCost = stocksCost + bondsCost + peFundsCalled + peDealsCost + liquidFundsCost;
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) : 0;

  const allocationData = [
    { name: 'Stocks', value: stocksValue },
    { name: 'Bonds', value: bondsValue },
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
      company: s.company_name,
      sector: s.sector,
      shares: s.shares,
      averageCost: s.average_cost,
      currentPrice: stockPrices[s.ticker] || s.current_price || s.average_cost,
      currency: s.currency
    })),
    bonds: bonds.map(b => ({
      name: b.name,
      type: b.bond_type,
      faceValue: b.face_value,
      couponRate: b.coupon_rate,
      maturityDate: b.maturity_date,
      rating: b.rating,
      currency: b.currency
    })),
    liquidFunds: liquidFunds.map(f => ({
      name: f.fund_name,
      type: f.fund_type,
      strategy: f.strategy,
      invested: f.investment_amount,
      currentValue: f.current_value,
      ytdReturn: f.ytd_return
    })),
    peFunds: peFunds.map(f => ({
      name: f.fund_name,
      type: f.fund_type,
      vintage: f.vintage_year,
      commitment: f.commitment,
      called: f.called_capital,
      nav: f.nav,
      distributions: f.distributions
    })),
    peDeals: peDeals.map(d => ({
      company: d.company_name,
      sector: d.sector,
      type: d.deal_type,
      invested: d.investment_amount,
      currentValue: d.current_value,
      status: d.status
    }))
  }), [totalValue, totalCost, totalGainPercent, allocationData, stocks, bonds, liquidFunds, peFunds, peDeals, stockPrices]);

  // Recent activity
  const allAssets = [
    ...stocks.map(s => ({ ...s, type: 'Stock', date: s.purchase_date })),
    ...bonds.map(b => ({ ...b, type: 'Bond', date: b.purchase_date })),
    ...liquidFunds.map(f => ({ ...f, type: 'Liquid Fund', date: f.investment_date })),
    ...peFunds.map(f => ({ ...f, type: 'PE Fund', date: f.commitment_date })),
    ...peDeals.map(d => ({ ...d, type: 'PE Deal', date: d.investment_date }))
  ].filter(a => a.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

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
            title="Total Value"
            value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Wallet}
            trend={totalGain >= 0 ? 'up' : 'down'}
            trendValue={`${totalGainPercent}%`}
            subValue="all time"
          />
          <StatCard
            title="Stocks"
            value={`$${stocksValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            trend={stocksGain >= 0 ? 'up' : 'down'}
            trendValue={`${stocksGainPercent}%`}
            subValue={`${stocks.length} positions`}
          />
          <StatCard
            title="Fixed Income"
            value={`$${bondsValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Landmark}
            subValue={`${bonds.length} bonds`}
          />
          <StatCard
            title="Liquid Funds"
            value={`$${liquidFundsValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Waves}
            trend={liquidFundsValue - liquidFundsCost >= 0 ? 'up' : 'down'}
            trendValue={liquidFundsCost > 0 ? `${(((liquidFundsValue - liquidFundsCost) / liquidFundsCost) * 100).toFixed(1)}%` : '0%'}
            subValue={`${liquidFunds.length} funds`}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
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
                          {asset.ticker || asset.name || asset.fund_name || asset.company_name}
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
                  ${peFunds.reduce((sum, f) => sum + (f.distributions || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Current NAV</p>
                <p className="text-2xl font-semibold text-slate-900">
                  ${peFunds.reduce((sum, f) => sum + (f.nav || 0), 0).toLocaleString()}
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