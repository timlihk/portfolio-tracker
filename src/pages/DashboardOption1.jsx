import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portfolioAPI } from '@/api/backendClient';
import StatCard from '@/components/portfolio/StatCard';
import AllocationChart from '@/components/portfolio/AllocationChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldAlert, Wallet, PieChart as PieIcon, Droplets, Target } from 'lucide-react';

const formatter = (val) => `$${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function DashboardOption1() {
  const [range] = useState('YTD'); // Placeholder for future snapshots/range filtering
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['insights'],
    queryFn: () => portfolioAPI.getInsights(),
  });

  const allocation = data?.allocation || [];
  const totals = data?.totals || {};
  const riskFlags = data?.riskFlags || [];
  const illiquidRatio = data?.illiquid?.ratio || 0;
  const topPosition = data?.topPosition;

  const concentrationFlag = useMemo(() => {
    return riskFlags.find((f) => f.id === 'concentration');
  }, [riskFlags]);

  const quickStats = [
    {
      title: 'Net Worth',
      value: formatter(totals.netWorth),
      icon: Wallet,
      subValue: `${formatter(totals.assets || 0)} assets - ${formatter(totals.liabilities || 0)} liabilities`,
    },
    {
      title: 'Cash',
      value: formatter(totals.cash),
      icon: Droplets,
      subValue: `${formatter(totals.liabilities || 0)} liabilities coverage`,
    },
    {
      title: 'Top Position',
      value: topPosition ? formatter(topPosition.value) : '—',
      icon: Target,
      subValue: topPosition ? topPosition.name : 'No positions',
    },
    {
      title: 'Illiquid %',
      value: `${(illiquidRatio * 100).toFixed(1)}%`,
      icon: PieIcon,
      subValue: 'PE + Liquid Funds share of assets',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio Overview (Option 1)</h1>
            <p className="text-slate-500">Concise pulse with allocation and risks</p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && (
              <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
              </Badge>
            )}
            <Badge variant="secondary" className="py-1.5 px-3">{range}</Badge>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
            Failed to load insights. Please retry.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              subValue={stat.subValue}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Allocation</h3>
              <Button size="sm" variant="ghost" className="text-slate-600 hover:text-slate-900">
                Manage Targets
              </Button>
            </div>
            {allocation.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-slate-400">No allocation data</div>
            ) : (
              <AllocationChart data={allocation} />
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Risk & Liquidity</h3>
                <p className="text-sm text-slate-500">Top risks and coverage</p>
              </div>
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>

            {riskFlags.length === 0 ? (
              <div className="text-sm text-slate-500">No active flags</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {riskFlags.map((flag) => (
                  <Badge
                    key={flag.id}
                    variant="outline"
                    className={`text-sm ${flag.severity === 'high' ? 'border-rose-300 text-rose-700' : 'border-amber-300 text-amber-700'}`}
                  >
                    {flag.label}: {flag.message}
                  </Badge>
                ))}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Cash Coverage</span>
                <span className="font-semibold">{totals.liabilities > 0 ? `${((totals.cash || 0) / (totals.liabilities || 1) * 100).toFixed(1)}%` : 'n/a'}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Illiquid Share</span>
                <span className="font-semibold">{(illiquidRatio * 100).toFixed(1)}%</span>
              </div>
              {concentrationFlag && (
                <div className="flex items-center justify-between mt-2">
                  <span>Top Position</span>
                  <span className="font-semibold">{concentrationFlag.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">What’s next?</h3>
              <p className="text-sm text-slate-500">Use allocation targets and clear risks to rebalance.</p>
            </div>
            <Button variant="outline">Open Original Dashboard</Button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
            <li>Set target weights per asset class and compare vs. actual.</li>
            <li>Address high concentration or low cash coverage first.</li>
            <li>Track unfunded commitments alongside liabilities.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
