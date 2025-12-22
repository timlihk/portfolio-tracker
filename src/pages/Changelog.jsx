import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Landmark, 
  Briefcase, 
  Building2, 
  Waves, 
  Wallet,
  Plus,
  Pencil,
  Trash2,
  History
} from 'lucide-react';

const ACTION_CONFIG = {
  created: { label: 'Created', color: 'bg-emerald-100 text-emerald-700', icon: Plus },
  updated: { label: 'Updated', color: 'bg-blue-100 text-blue-700', icon: Pencil },
  deleted: { label: 'Deleted', color: 'bg-rose-100 text-rose-700', icon: Trash2 }
};

const ASSET_ICONS = {
  Stock: TrendingUp,
  Bond: Landmark,
  'PE Fund': Briefcase,
  'PE Deal': Building2,
  'Liquid Fund': Waves,
  Account: Wallet
};

const ASSET_COLORS = {
  Stock: 'bg-sky-50 text-sky-600',
  Bond: 'bg-emerald-50 text-emerald-600',
  'PE Fund': 'bg-violet-50 text-violet-600',
  'PE Deal': 'bg-amber-50 text-amber-600',
  'Liquid Fund': 'bg-cyan-50 text-cyan-600',
  Account: 'bg-slate-50 text-slate-600'
};

export default function Changelog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['changelog'],
    queryFn: () => base44.entities.Changelog.list('-createdDate', 100)
  });

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = format(new Date(log.createdDate), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Changelog</h1>
          <p className="text-slate-500 mt-1">History of all portfolio changes</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No changes recorded yet</p>
            <p className="text-sm text-slate-400 mt-1">Changes to your portfolio will appear here</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-500 mb-4">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {dayLogs.map((log, index) => {
                    const ActionIcon = ACTION_CONFIG[log.action]?.icon || Pencil;
                    const AssetIcon = ASSET_ICONS[log.assetType] || Wallet;
                    
                    return (
                      <div 
                        key={log.id}
                        className={`flex items-center gap-4 p-4 ${index !== dayLogs.length - 1 ? 'border-b border-slate-50' : ''}`}
                      >
                        <div className={`p-2 rounded-xl ${ASSET_COLORS[log.assetType] || 'bg-slate-50 text-slate-600'}`}>
                          <AssetIcon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">
                              {log.assetName}
                            </span>
                            <Badge className={`${ACTION_CONFIG[log.action]?.color} text-xs`}>
                              <ActionIcon className="w-3 h-3 mr-1" />
                              {ACTION_CONFIG[log.action]?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">{log.assetType}</span>
                            {log.details && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-sm text-slate-400 truncate">{log.details}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-sm text-slate-400">
                          {format(new Date(log.createdDate), 'h:mm a')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
