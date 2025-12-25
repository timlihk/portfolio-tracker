import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  Briefcase,
  Building2,
  Waves,
  Wallet,
  History,
  Receipt,
  Menu,
  X,
  ChevronRight,
  Banknote,
  CreditCard,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  name: string;
  page: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Accounts', page: 'Accounts', icon: Wallet },
  { name: 'Stocks', page: 'Stocks', icon: TrendingUp },
  { name: 'Bonds', page: 'Bonds', icon: Landmark },
  { name: 'Cash & Deposits', page: 'CashDeposits', icon: Banknote },
  { name: 'Liquid Funds', page: 'LiquidFunds', icon: Waves },
  { name: 'PE Funds', page: 'PEFunds', icon: Briefcase },
  { name: 'PE Deals', page: 'PEDeals', icon: Building2 },
  { name: 'Liabilities', page: 'Liabilities', icon: CreditCard },
  { name: 'Transactions', page: 'Transactions', icon: Receipt },
  { name: 'Changelog', page: 'Changelog', icon: History },
  { name: 'Login', page: 'Login', icon: Lock },
];

export interface LayoutProps {
  children: ReactNode;
  currentPageName?: string;
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <span className="ml-4 font-semibold text-slate-900">Portfolio Tracker</span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Portfolio</h1>
                <p className="text-xs text-slate-500">Investment Tracker</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                <span className="font-medium">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100">
            <p className="text-xs text-slate-500 mb-1">Track your wealth</p>
            <p className="text-sm font-medium text-slate-700">All asset classes in one place</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
