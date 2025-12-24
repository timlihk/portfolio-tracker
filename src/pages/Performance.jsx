import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import { useExchangeRates, useStockPrices } from '@/components/portfolio/useMarketData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subMonths, subYears, startOfMonth, eachMonthOfInterval, isAfter, isBefore } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TIME_PERIODS = [
  { label: '1 Year', value: '1y', months: 12 },
  { label: '3 Years', value: '3y', months: 36 },
  { label: '5 Years', value: '5y', months: 60 },
  { label: 'All Time', value: 'all', months: 120 },
];

const GRAPH_TYPES = [
  { label: 'Value - Stacked', value: 'stacked' },
  { label: 'Value - Line', value: 'line' },
  { label: 'Percentage', value: 'percent' },
];

const ASSET_COLORS = {
  'Stocks': '#f59e0b',
  'Bonds': '#ec4899',
  'PE Funds': '#8b5cf6',
  'PE Deals': '#06b6d4',
  'Liquid Funds': '#10b981',
  'Cash': '#6366f1',
};

const formatCurrency = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
};

const formatFullCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function Performance() {
  const [timePeriod, setTimePeriod] = useState('5y');
  const [graphType, setGraphType] = useState('stacked');
  const [showClosedPositions, setShowClosedPositions] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [selectedAssetClass, setSelectedAssetClass] = useState('all');

  // Fetch all portfolio data
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

  const { convertToUSD } = useExchangeRates();
  const stockTickers = useMemo(() => stocks.map(s => s.ticker).filter(Boolean), [stocks]);
  const { prices: stockPrices = {} } = useStockPrices(stockTickers);

  const isLoading = stocksLoading || bondsLoading || peFundsLoading || peDealsLoading || liquidFundsLoading || cashLoading;

  // Generate historical data points
  const chartData = useMemo(() => {
    const period = TIME_PERIODS.find(p => p.value === timePeriod);
    const monthsBack = period?.months || 60;
    const endDate = new Date();
    const startDate = subMonths(endDate, monthsBack);

    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(date => {
      const monthKey = format(date, 'MMM yy');

      // Calculate stock value at this point (only include if purchased before this date)
      const stocksValue = stocks
        .filter(s => {
          const purchaseDate = s.purchaseDate ? new Date(s.purchaseDate) : null;
          return !purchaseDate || isBefore(purchaseDate, date);
        })
        .reduce((sum, s) => {
          const shares = Number(s.shares) || 0;
          const price = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0;
          // Simulate some historical variance
          const monthsAgo = Math.floor((endDate - date) / (30 * 24 * 60 * 60 * 1000));
          const variance = 1 - (monthsAgo * 0.008 * (Math.random() * 0.5 + 0.75));
          return sum + convertToUSD(shares * price * Math.max(0.3, variance), s.currency);
        }, 0);

      const bondsValue = bonds
        .filter(b => {
          const purchaseDate = b.purchaseDate ? new Date(b.purchaseDate) : null;
          return !purchaseDate || isBefore(purchaseDate, date);
        })
        .reduce((sum, b) => {
          const value = Number(b.currentValue) || Number(b.purchasePrice) || 0;
          return sum + convertToUSD(value, b.currency);
        }, 0);

      const peFundsValue = peFunds
        .filter(f => {
          const commitDate = f.commitmentDate ? new Date(f.commitmentDate) : null;
          return !commitDate || isBefore(commitDate, date);
        })
        .reduce((sum, f) => {
          const nav = Number(f.nav) || 0;
          const dist = Number(f.distributions) || 0;
          const monthsAgo = Math.floor((endDate - date) / (30 * 24 * 60 * 60 * 1000));
          const variance = 1 - (monthsAgo * 0.005);
          return sum + (nav + dist) * Math.max(0.5, variance);
        }, 0);

      const peDealsValue = peDeals
        .filter(d => {
          const investDate = d.investmentDate ? new Date(d.investmentDate) : null;
          return !investDate || isBefore(investDate, date);
        })
        .reduce((sum, d) => {
          const value = Number(d.currentValue) || Number(d.investmentAmount) || 0;
          const monthsAgo = Math.floor((endDate - date) / (30 * 24 * 60 * 60 * 1000));
          const variance = 1 - (monthsAgo * 0.006);
          return sum + value * Math.max(0.4, variance);
        }, 0);

      const liquidFundsValue = liquidFunds
        .filter(f => {
          const investDate = f.investmentDate ? new Date(f.investmentDate) : null;
          return !investDate || isBefore(investDate, date);
        })
        .reduce((sum, f) => {
          const value = Number(f.currentValue) || Number(f.investmentAmount) || 0;
          return sum + value;
        }, 0);

      const cashValue = cashDeposits
        .filter(c => {
          const depositDate = c.startDate ? new Date(c.startDate) : null;
          return !depositDate || isBefore(depositDate, date);
        })
        .reduce((sum, c) => {
          return sum + convertToUSD(Number(c.amount) || 0, c.currency);
        }, 0);

      return {
        date: monthKey,
        Stocks: Math.round(stocksValue),
        Bonds: Math.round(bondsValue),
        'PE Funds': Math.round(peFundsValue),
        'PE Deals': Math.round(peDealsValue),
        'Liquid Funds': Math.round(liquidFundsValue),
        Cash: Math.round(cashValue),
        total: Math.round(stocksValue + bondsValue + peFundsValue + peDealsValue + liquidFundsValue + cashValue)
      };
    });
  }, [stocks, bonds, peFunds, peDeals, liquidFunds, cashDeposits, stockPrices, convertToUSD, timePeriod]);

  // Calculate current totals and holdings data
  const { currentValue, holdings, totalGains, totalDividends } = useMemo(() => {
    const stockHoldings = stocks.map(s => {
      const shares = Number(s.shares) || 0;
      const avgCost = Number(s.averageCost) || 0;
      const currentPrice = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || avgCost;
      const value = convertToUSD(shares * currentPrice, s.currency);
      const cost = convertToUSD(shares * avgCost, s.currency);
      const capitalGains = value - cost;
      const dividends = Number(s.dividends) || 0;
      const totalReturn = capitalGains + dividends;

      return {
        id: s.id,
        ticker: s.ticker,
        name: s.companyName,
        assetClass: 'Stocks',
        price: currentPrice,
        quantity: shares,
        value,
        cost,
        capitalGains,
        dividends,
        currency: s.currency || 'USD',
        return: totalReturn,
        returnPercent: cost > 0 ? (totalReturn / cost) * 100 : 0
      };
    });

    const bondHoldings = bonds.map(b => {
      const value = convertToUSD(Number(b.currentValue) || Number(b.purchasePrice) || 0, b.currency);
      const cost = convertToUSD(Number(b.purchasePrice) || 0, b.currency);
      const capitalGains = value - cost;
      const interest = Number(b.accruedInterest) || 0;

      return {
        id: b.id,
        ticker: b.name,
        name: b.issuer || b.bondType,
        assetClass: 'Bonds',
        price: value,
        quantity: 1,
        value,
        cost,
        capitalGains,
        dividends: interest,
        currency: b.currency || 'USD',
        return: capitalGains + interest,
        returnPercent: cost > 0 ? ((capitalGains + interest) / cost) * 100 : 0
      };
    });

    const peFundHoldings = peFunds.map(f => {
      const nav = Number(f.nav) || 0;
      const dist = Number(f.distributions) || 0;
      const called = Number(f.calledCapital) || 0;
      const value = nav + dist;
      const capitalGains = value - called;

      return {
        id: f.id,
        ticker: f.fundName,
        name: f.fundType || 'PE Fund',
        assetClass: 'PE Funds',
        price: nav,
        quantity: 1,
        value,
        cost: called,
        capitalGains,
        dividends: dist,
        currency: 'USD',
        return: capitalGains,
        returnPercent: called > 0 ? (capitalGains / called) * 100 : 0
      };
    });

    const peDealHoldings = peDeals.map(d => {
      const value = Number(d.currentValue) || Number(d.investmentAmount) || 0;
      const cost = Number(d.investmentAmount) || 0;
      const capitalGains = value - cost;

      return {
        id: d.id,
        ticker: d.companyName,
        name: d.dealType || 'Direct Investment',
        assetClass: 'PE Deals',
        price: value,
        quantity: 1,
        value,
        cost,
        capitalGains,
        dividends: 0,
        currency: 'USD',
        return: capitalGains,
        returnPercent: cost > 0 ? (capitalGains / cost) * 100 : 0
      };
    });

    const liquidFundHoldings = liquidFunds.map(f => {
      const value = Number(f.currentValue) || Number(f.investmentAmount) || 0;
      const cost = Number(f.investmentAmount) || 0;
      const capitalGains = value - cost;

      return {
        id: f.id,
        ticker: f.fundName,
        name: f.fundType || 'Liquid Fund',
        assetClass: 'Liquid Funds',
        price: value,
        quantity: 1,
        value,
        cost,
        capitalGains,
        dividends: 0,
        currency: 'USD',
        return: capitalGains,
        returnPercent: cost > 0 ? (capitalGains / cost) * 100 : 0
      };
    });

    const allHoldings = [...stockHoldings, ...bondHoldings, ...peFundHoldings, ...peDealHoldings, ...liquidFundHoldings];
    const totalValue = allHoldings.reduce((sum, h) => sum + h.value, 0);
    const totalGainsVal = allHoldings.reduce((sum, h) => sum + h.capitalGains, 0);
    const totalDividendsVal = allHoldings.reduce((sum, h) => sum + h.dividends, 0);

    return {
      currentValue: totalValue,
      holdings: allHoldings,
      totalGains: totalGainsVal,
      totalDividends: totalDividendsVal
    };
  }, [stocks, bonds, peFunds, peDeals, liquidFunds, stockPrices, convertToUSD]);

  // Group holdings by asset class
  const groupedHoldings = useMemo(() => {
    const filtered = selectedAssetClass === 'all'
      ? holdings
      : holdings.filter(h => h.assetClass === selectedAssetClass);

    const groups = {};
    filtered.forEach(h => {
      if (!groups[h.assetClass]) {
        groups[h.assetClass] = [];
      }
      groups[h.assetClass].push(h);
    });
    return groups;
  }, [holdings, selectedAssetClass]);

  const assetClasses = ['all', ...Object.keys(ASSET_COLORS)];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Portfolio</h1>
            <p className="text-slate-500 text-sm">Track performance over time</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Current portfolio value</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatFullCurrency(currentValue)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Time Period */}
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {TIME_PERIODS.map(p => (
                <option key={p.value} value={p.value}>In the last {p.label.toLowerCase()}</option>
              ))}
            </select>

            {/* Graph Type */}
            <select
              value={graphType}
              onChange={(e) => setGraphType(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {GRAPH_TYPES.map(g => (
                <option key={g.value} value={g.value}>Graph {g.label.toLowerCase()}</option>
              ))}
            </select>

            {/* Asset Class Filter */}
            <select
              value={selectedAssetClass}
              onChange={(e) => setSelectedAssetClass(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Asset Classes</option>
              {Object.keys(ASSET_COLORS).map(ac => (
                <option key={ac} value={ac}>{ac}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <Switch
                checked={showClosedPositions}
                onCheckedChange={setShowClosedPositions}
              />
              Showing open & closed positions
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <Switch
                checked={showPercentage}
                onCheckedChange={setShowPercentage}
              />
              Showing percentage gains
            </label>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {Object.entries(ASSET_COLORS).map(([name, color]) => (
                    <linearGradient key={name} id={`color${name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0.3}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={formatCurrency}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  formatter={(value, name) => [`$${formatFullCurrency(value)}`, name]}
                  labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                />
                {graphType === 'stacked' ? (
                  Object.entries(ASSET_COLORS).map(([name, color]) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stackId="1"
                      stroke={color}
                      fill={`url(#color${name.replace(/\s/g, '')})`}
                    />
                  ))
                ) : (
                  Object.entries(ASSET_COLORS).map(([name, color]) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={color}
                      fill="none"
                      strokeWidth={2}
                    />
                  ))
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {Object.entries(groupedHoldings).map(([assetClass, items]) => (
            <div key={assetClass}>
              {/* Asset Class Header */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ASSET_COLORS[assetClass] }}
                  />
                  <span className="font-semibold text-slate-700">{assetClass}</span>
                  <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-8 gap-4 px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div className="col-span-2">{assetClass}</div>
                <div className="text-right">Price</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Value</div>
                <div className="text-right">Capital Gains</div>
                <div className="text-right">Dividends</div>
                <div className="text-right">Return</div>
              </div>

              {/* Holdings Rows */}
              {items.map((item) => (
                <div
                  key={`${assetClass}-${item.id}`}
                  className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="col-span-2">
                    <span className="font-medium text-blue-600">{item.ticker}</span>
                    {item.name && <span className="text-slate-500 ml-2">{item.name}</span>}
                  </div>
                  <div className="text-right text-slate-700">
                    {formatFullCurrency(item.price)}
                  </div>
                  <div className="text-right text-slate-700">
                    {item.quantity.toLocaleString()}
                  </div>
                  <div className="text-right font-medium text-slate-900">
                    {formatFullCurrency(item.value)}
                  </div>
                  <div className={cn(
                    "text-right font-medium",
                    item.capitalGains >= 0 ? "text-slate-700" : "text-rose-600"
                  )}>
                    {item.capitalGains < 0 && '-'}
                    {formatFullCurrency(Math.abs(item.capitalGains))}
                  </div>
                  <div className="text-right text-slate-700">
                    {formatFullCurrency(item.dividends)}
                  </div>
                  <div className={cn(
                    "text-right font-semibold",
                    item.return >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {showPercentage
                      ? `${item.returnPercent >= 0 ? '+' : ''}${item.returnPercent.toFixed(1)}%`
                      : `${item.return < 0 ? '-' : ''}${formatFullCurrency(Math.abs(item.return))}`
                    }
                  </div>
                </div>
              ))}

              {/* Asset Class Total */}
              <div className="grid grid-cols-8 gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-200">
                <div className="col-span-2 font-semibold text-slate-700">Total</div>
                <div></div>
                <div></div>
                <div className="text-right font-bold text-slate-900">
                  {formatFullCurrency(items.reduce((sum, i) => sum + i.value, 0))}
                </div>
                <div className={cn(
                  "text-right font-bold",
                  items.reduce((sum, i) => sum + i.capitalGains, 0) >= 0 ? "text-slate-700" : "text-rose-600"
                )}>
                  {formatFullCurrency(items.reduce((sum, i) => sum + i.capitalGains, 0))}
                </div>
                <div className="text-right font-bold text-slate-700">
                  {formatFullCurrency(items.reduce((sum, i) => sum + i.dividends, 0))}
                </div>
                <div className={cn(
                  "text-right font-bold",
                  items.reduce((sum, i) => sum + i.return, 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatFullCurrency(items.reduce((sum, i) => sum + i.return, 0))}
                </div>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="grid grid-cols-8 gap-4 px-6 py-4 bg-slate-100">
            <div className="col-span-2 font-bold text-slate-900">Portfolio Total</div>
            <div></div>
            <div></div>
            <div className="text-right font-bold text-slate-900 text-lg">
              {formatFullCurrency(currentValue)}
            </div>
            <div className={cn(
              "text-right font-bold text-lg",
              totalGains >= 0 ? "text-slate-700" : "text-rose-600"
            )}>
              {formatFullCurrency(totalGains)}
            </div>
            <div className="text-right font-bold text-slate-700 text-lg">
              {formatFullCurrency(totalDividends)}
            </div>
            <div className={cn(
              "text-right font-bold text-lg",
              (totalGains + totalDividends) >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {formatFullCurrency(totalGains + totalDividends)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
