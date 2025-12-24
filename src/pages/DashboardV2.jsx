import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, entities } from '@/api/backendClient';
import {
  TrendingUp,
  Briefcase,
  Landmark,
  Wallet,
  Waves,
  Banknote,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  Plus,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#f97316'];

const TIME_PERIODS = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: 'YTD', value: 'ytd' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
];

// Clickable stat card component
function InteractiveStatCard({ title, value, subValue, icon: Icon, onClick, trend, trendValue, className }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-slate-200 hover:scale-[1.02]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {trend && trendValue && (
              <span className={cn(
                "text-sm font-medium",
                trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            )}
            {subValue && (
              <span className="text-sm text-slate-400">{subValue}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClick && (
            <ChevronRight className="w-4 h-4 text-slate-300" />
          )}
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Risk flag badge component
function RiskFlag({ flag }) {
  const severityColors = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
      severityColors[flag.severity]
    )}>
      <AlertTriangle className="w-4 h-4" />
      <span className="font-medium">{flag.label}:</span>
      <span>{flag.message}</span>
    </div>
  );
}

// Interactive pie chart with click handlers
function InteractiveAllocationChart({ data, onSegmentClick }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Asset Allocation</h3>
      <div className="flex items-center gap-6">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(_, index) => onSegmentClick?.(data[index])}
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                    stroke={activeIndex === index ? '#1e293b' : 'none'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <div
                key={item.name}
                onClick={() => onSegmentClick?.(item)}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeIndex === index ? "bg-slate-100" : "hover:bg-slate-50"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-900">
                    ${item.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Top holdings component
function TopHoldings({ stocks, onHoldingClick }) {
  const sortedStocks = useMemo(() => {
    return [...stocks]
      .map(s => ({
        ...s,
        value: (Number(s.shares) || 0) * (Number(s.currentPrice) || Number(s.averageCost) || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [stocks]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top Holdings</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onHoldingClick?.('all')}
          className="text-slate-500 hover:text-slate-700"
        >
          View all <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {sortedStocks.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-400">
          No holdings yet
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStocks.map((stock, index) => (
            <div
              key={stock.id}
              onClick={() => onHoldingClick?.(stock)}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{stock.ticker || stock.companyName}</p>
                  <p className="text-xs text-slate-500">{stock.shares} shares</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  ${stock.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                {stock.averageCost && stock.currentPrice && (
                  <p className={cn(
                    "text-xs font-medium",
                    stock.currentPrice >= stock.averageCost ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {stock.currentPrice >= stock.averageCost ? '+' : ''}
                    {(((stock.currentPrice - stock.averageCost) / stock.averageCost) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Quick action buttons
function QuickActions({ onAction }) {
  const actions = [
    { label: 'Stock', icon: TrendingUp, path: '/Stocks' },
    { label: 'Bond', icon: Landmark, path: '/Bonds' },
    { label: 'Cash', icon: Banknote, path: '/CashDeposits' },
    { label: 'PE Fund', icon: Briefcase, path: '/PEFunds' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500 mr-2">Quick add:</span>
      {actions.map(action => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.path)}
          className="gap-1"
        >
          <Plus className="w-3 h-3" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export default function DashboardV2() {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState('all');

  // Use insights endpoint for aggregated data
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => portfolioAPI.getInsights()
  });

  // Still need stocks for top holdings (could be moved to insights endpoint later)
  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => entities.Stock.list()
  });

  const isLoading = insightsLoading || stocksLoading;

  // Navigation handlers
  const handleStatCardClick = (path) => {
    navigate(path);
  };

  const handleAllocationClick = (segment) => {
    const pathMap = {
      'Stocks': '/Stocks',
      'Bonds': '/Bonds',
      'Cash & Deposits': '/CashDeposits',
      'Liquid Funds': '/LiquidFunds',
      'PE Funds': '/PEFunds',
      'PE Deals': '/PEDeals'
    };
    const path = pathMap[segment.name];
    if (path) navigate(path);
  };

  const handleHoldingClick = (item) => {
    if (item === 'all') {
      navigate('/Stocks');
    } else {
      navigate('/Stocks');
    }
  };

  const handleQuickAdd = (path) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  const { totals = {}, allocation = [], riskFlags = [], topPosition, illiquid = {} } = insights || {};
  const { assets = 0, liabilities = 0, netWorth = 0, cash = 0 } = totals;

  // Calculate liquid vs illiquid
  const liquidValue = (allocation.find(a => a.name === 'Stocks')?.value || 0) +
                      (allocation.find(a => a.name === 'Bonds')?.value || 0) +
                      (allocation.find(a => a.name === 'Cash & Deposits')?.value || 0);
  const illiquidValue = illiquid.value || 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portfolio Overview</h1>
            <p className="text-slate-500 text-sm mt-0.5">Click any card to view details</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time period selector */}
            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
              {TIME_PERIODS.map(period => (
                <button
                  key={period.value}
                  onClick={() => setTimePeriod(period.value)}
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                    timePeriod === period.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <Badge variant="secondary" className="py-1.5 px-3">USD</Badge>
          </div>
        </div>

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {riskFlags.map(flag => (
              <RiskFlag key={flag.id} flag={flag} />
            ))}
          </div>
        )}

        {/* Main Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <InteractiveStatCard
            title="Net Worth"
            value={`$${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue={liabilities > 0 ? `after $${liabilities.toLocaleString()} debt` : undefined}
            icon={Wallet}
            className="sm:col-span-2 lg:col-span-1"
          />
          <InteractiveStatCard
            title="Liquid Assets"
            value={`$${liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue="Stocks, Bonds, Cash"
            icon={TrendingUp}
            onClick={() => handleStatCardClick('/Stocks')}
          />
          <InteractiveStatCard
            title="Illiquid Assets"
            value={`$${illiquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue={illiquid.ratio ? `${(illiquid.ratio * 100).toFixed(0)}% of portfolio` : undefined}
            icon={Briefcase}
            onClick={() => handleStatCardClick('/PEFunds')}
          />
          <InteractiveStatCard
            title="Liabilities"
            value={liabilities > 0 ? `-$${liabilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0'}
            subValue={liabilities > 0 ? 'Active debt' : 'No debt'}
            icon={CreditCard}
            onClick={() => handleStatCardClick('/Liabilities')}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions onAction={handleQuickAdd} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <InteractiveAllocationChart
            data={allocation}
            onSegmentClick={handleAllocationClick}
          />
          <TopHoldings
            stocks={stocks}
            onHoldingClick={handleHoldingClick}
          />
        </div>

        {/* Asset Class Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {allocation.map((item, index) => {
            const icons = {
              'Stocks': TrendingUp,
              'Bonds': Landmark,
              'Cash & Deposits': Banknote,
              'Liquid Funds': Waves,
              'PE Funds': Briefcase,
              'PE Deals': Building2
            };
            const Icon = icons[item.name] || Wallet;
            const paths = {
              'Stocks': '/Stocks',
              'Bonds': '/Bonds',
              'Cash & Deposits': '/CashDeposits',
              'Liquid Funds': '/LiquidFunds',
              'PE Funds': '/PEFunds',
              'PE Deals': '/PEDeals'
            };

            return (
              <div
                key={item.name}
                onClick={() => navigate(paths[item.name])}
                className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 truncate">{item.name}</p>
                <p className="text-sm font-semibold text-slate-900">
                  ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
