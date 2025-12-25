import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AssetTable from '@/components/portfolio/AssetTable';
import { Plus, Building2, TrendingUp, Landmark, ChevronDown, ChevronUp, Pencil, Trash2, CreditCard, Banknote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useExchangeRates, useStockPrices, useBondPrices, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import PaginationControls from '@/components/portfolio/PaginationControls';
import type { Account, Stock, Bond, CashDeposit, Liability } from '@/types';
import type React from 'react';

const ACCOUNT_TYPES = ['Brokerage', 'IRA', '401k', 'Roth IRA', 'Bank', 'Other'];

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({});
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const queryClient = useQueryClient();

  type PaginatedResponse<T> = {
    data: T[];
    pagination?: {
      total?: number;
      page?: number;
      limit?: number;
    };
  };

  const { data: accountsResponse = [] , isFetching: accountsLoading } = useQuery<PaginatedResponse<Account> | Account[]>({
    queryKey: ['accounts', page, limit],
    queryFn: () => entities.Account.listWithPagination({ page, limit }),
    placeholderData: keepPreviousData
  });
  const accounts = Array.isArray(accountsResponse)
    ? accountsResponse
    : accountsResponse?.data || [];
  const pagination = !Array.isArray(accountsResponse)
    ? accountsResponse?.pagination || { total: accounts.length, page, limit }
    : { total: accounts.length, page, limit };

  const { data: stocks = [] } = useQuery<Stock[]>({
    queryKey: ['stocks'],
    queryFn: () => entities.Stock.list()
  });

  const { data: bonds = [] } = useQuery<Bond[]>({
    queryKey: ['bonds'],
    queryFn: () => entities.Bond.list()
  });

  const { data: liabilities = [] } = useQuery<Liability[]>({
    queryKey: ['liabilities'],
    queryFn: () => entities.Liability.list()
  });

  const { data: cashDeposits = [] } = useQuery<CashDeposit[]>({
    queryKey: ['cashDeposits'],
    queryFn: () => entities.CashDeposit.list()
  });

  const { convertToUSD } = useExchangeRates();
  
  const stockTickers = stocks.map(s => s.ticker).filter(Boolean);
  const { prices: stockPrices } = useStockPrices(stockTickers);
  const { prices: bondPrices = {} } = useBondPrices(bonds);

  // Helper to get current price (real-time or manual)
  // Note: PostgreSQL returns DECIMAL as strings, so we need to convert to numbers
  const getCurrentPrice = (stock: Stock) =>
    Number(stockPrices[stock.ticker]?.price) || Number(stock.currentPrice) || Number(stock.averageCost) || 0;

  const getBondPricePct = (bond: Bond) => {
    if (Number.isFinite(Number(bond.currentValue))) return Number(bond.currentValue);
    const entry = bondPrices[bond.id] || bondPrices[bond.isin] || bondPrices[bond.name];
    if (entry && typeof entry === 'object' && Number.isFinite(entry.pricePct)) return Number(entry.pricePct);
    if (entry != null && Number.isFinite(Number(entry))) return Number(entry);
    if (Number.isFinite(Number(bond.purchasePrice))) return Number(bond.purchasePrice);
    return 100;
  };
  const getBondMarketValue = (bond: Bond) => {
    const face = Number(bond.faceValue) || 0;
    return face * (getBondPricePct(bond) / 100);
  };

  // Columns for stocks table (matching Stocks page)
  type TableColumn<T> = {
    key: keyof T | string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render?: (val: T[keyof T] | undefined, row: T) => React.ReactNode;
  };

  const stockColumns: TableColumn<Stock>[] = useMemo(() => [
    {
      key: 'ticker',
      label: 'Ticker',
      render: (val, row) => {
        // Use Yahoo Finance data if available, otherwise use stored data
        const yahooData = stockPrices[row.ticker];
        const companyName = row.companyName || yahooData?.name || yahooData?.shortName;
        const sector = row.sector || yahooData?.sector;
        return (
          <div>
            <span className="font-semibold text-slate-900">{val}</span>
            {companyName && (
              <p className="text-sm text-slate-500">{companyName}</p>
            )}
            {sector && (
              <p className="text-xs text-slate-400">{sector}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'shares',
      label: 'Shares',
      align: 'right',
      render: (val) => (val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    },
    {
      key: 'averageCost',
      label: 'Avg Cost',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return `${symbol}${(Number(val) || 0).toFixed(2)}`;
      }
    },
    {
      key: 'currentPrice',
      label: 'Current',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const price = getCurrentPrice(row);
        const isLive = stockPrices[row.ticker]?.price && !row.currentPrice;
        return (
          <div className="flex items-center justify-end gap-1">
            <span>{symbol}{(price || 0).toFixed(2)}</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Live price" />}
          </div>
        );
      }
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      align: 'right',
      render: (_, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const price = getCurrentPrice(row);
        const value = (Number(row.shares) || 0) * price;
        return <span className="font-medium">{symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    {
      key: 'gainLoss',
      label: 'Gain/Loss',
      align: 'right',
      render: (_, row) => {
        const price = getCurrentPrice(row);
        const shares = Number(row.shares) || 0;
        const avgCost = Number(row.averageCost) || 0;
        const cost = shares * avgCost;
        const value = shares * price;
        const gain = value - cost;
        const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : '0.0';
        const isPositive = gain >= 0;
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return (
          <div className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            <span className="font-medium">{isPositive ? '+' : ''}{gainPct}%</span>
            <p className="text-xs">{symbol}{Math.abs(gain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        );
      }
    },
    {
      key: 'currency',
      label: 'Ccy',
      render: (val) => (
        <Badge variant="outline" className="font-normal text-xs">
          {val || 'USD'}
        </Badge>
      )
    },
    {
      key: 'account',
      label: 'Account',
      render: (val) => val ? (
        <Badge variant="outline" className="font-normal">
          {val}
        </Badge>
      ) : '-'
    }
  ], [stockPrices, CURRENCY_SYMBOLS]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Account>) => entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Account> }) => entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleExpanded = (accountName: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountName]: !prev[accountName]
    }));
  };

  // Group assets by account - all values converted to USD
  const getAccountAssets = (accountName: string) => {
    const accountStocks = stocks.filter(s => s.account === accountName);
    const accountBonds = bonds.filter(b => b.account === accountName);
    const accountLiabilities = liabilities.filter(l => l.account === accountName && l.status !== 'Paid Off');
    const accountCash = cashDeposits.filter(c => c.account === accountName);
    
    const stocksValue = accountStocks.reduce((sum, s) => {
      const price = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0;
      const value = Number(s.shares) * price;
      return sum + convertToUSD(value, s.currency);
    }, 0);
    const bondsValue = accountBonds.reduce((sum, b) => {
      const value = getBondMarketValue(b);
      return sum + convertToUSD(value, b.currency);
    }, 0);
    const liabilitiesValue = accountLiabilities.reduce((sum, l) => {
      return sum + convertToUSD(Number(l.outstandingBalance) || 0, l.currency);
    }, 0);
    const cashValue = accountCash.reduce((sum, c) => {
      return sum + convertToUSD(Number(c.amount) || 0, c.currency);
    }, 0);
    
    return {
      stocks: accountStocks,
      bonds: accountBonds,
      liabilities: accountLiabilities,
      cash: accountCash,
      stocksValue,
      bondsValue,
      liabilitiesValue,
      cashValue,
      totalValue: stocksValue + bondsValue + cashValue - liabilitiesValue
    };
  };

  // Get unassigned assets - all values converted to USD
  const unassignedStocks = stocks.filter(s => !s.account);
  const unassignedBonds = bonds.filter(b => !b.account);
  const unassignedValue =
    unassignedStocks.reduce((sum, s) => {
      const price = Number(stockPrices[s.ticker]?.price) || Number(s.currentPrice) || Number(s.averageCost) || 0;
      return sum + convertToUSD(Number(s.shares) * price, s.currency);
    }, 0) +
    unassignedBonds.reduce((sum, b) => sum + convertToUSD(getBondMarketValue(b), b.currency), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
            <p className="text-slate-500 mt-1">{(pagination?.total ?? accounts.length)} accounts</p>
          </div>
          <Button 
            onClick={() => { setFormData({}); setDialogOpen(true); }}
            className="bg-slate-900 hover:bg-slate-800 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => {
            const assets = getAccountAssets(account.name);
            const isExpanded = expandedAccounts[account.name];
            
            return (
              <Card key={account.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(account.name)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-100 rounded-xl">
                            <Building2 className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{account.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {account.institution && (
                                <span className="text-sm text-slate-500">{account.institution}</span>
                              )}
                              {account.accountType && (
                                <Badge variant="secondary" className="text-xs">{account.accountType}</Badge>
                              )}
                              {account.accountNumber && (
                                <span className="text-xs text-slate-400">••••{account.accountNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-semibold text-slate-900">
                              ${assets.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm text-slate-500">
                              {assets.stocks.length} stocks • {assets.bonds.length} bonds{assets.cash.length > 0 ? ` • ${assets.cash.length} cash` : ''}{assets.liabilities.length > 0 ? ` • ${assets.liabilities.length} loans` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setFormData(account); setDialogOpen(true); }}
                            >
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(account); }}
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t">
                      {assets.stocks.length === 0 && assets.bonds.length === 0 && assets.cash.length === 0 && assets.liabilities.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No assets in this account</p>
                      ) : (
                        <div className="space-y-6 pt-4">
                          {assets.stocks.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-sky-600" />
                                <h4 className="font-medium text-slate-700">Stocks</h4>
                                <span className="text-sm text-slate-400">
                                  ${assets.stocksValue.toLocaleString()}
                                </span>
                              </div>
                              <AssetTable
                                columns={stockColumns}
                                data={assets.stocks}
                                onEdit={undefined}
                                onDelete={undefined}
                                emptyMessage="No stocks in this account"
                              />
                            </div>
                          )}
                          
                          {assets.bonds.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Landmark className="w-4 h-4 text-emerald-600" />
                                <h4 className="font-medium text-slate-700">Bonds</h4>
                                <span className="text-sm text-slate-400">
                                  ${assets.bondsValue.toLocaleString()}
                                </span>
                              </div>
                              <div className="grid gap-2">
                                {assets.bonds.map((bond) => (
                                  <div key={bond.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-900">{bond.name}</span>
                                      {bond.bondType && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{bond.bondType}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${convertToUSD(Number(bond.currentValue) || Number(bond.purchasePrice) || 0, bond.currency).toLocaleString()}
                                      </p>
                                      {bond.couponRate && (
                                        <p className="text-xs text-slate-500">{Number(bond.couponRate)}% coupon {bond.currency && bond.currency !== 'USD' ? `(${bond.currency})` : ''}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {assets.cash.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Banknote className="w-4 h-4 text-amber-600" />
                                <h4 className="font-medium text-slate-700">Cash & Deposits</h4>
                                <span className="text-sm text-slate-400">
                                  ${assets.cashValue.toLocaleString()}
                                </span>
                              </div>
                              <div className="grid gap-2">
                                {assets.cash.map((deposit) => (
                                  <div key={deposit.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-900">{deposit.name}</span>
                                      {deposit.depositType && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{deposit.depositType}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${convertToUSD(Number(deposit.amount) || 0, deposit.currency).toLocaleString()}
                                      </p>
                                      {deposit.interestRate && (
                                        <p className="text-xs text-slate-500">{Number(deposit.interestRate)}% interest {deposit.currency && deposit.currency !== 'USD' ? `(${deposit.currency})` : ''}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {assets.liabilities.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="w-4 h-4 text-rose-600" />
                                <h4 className="font-medium text-slate-700">Liabilities</h4>
                                <span className="text-sm text-rose-500">
                                  -${assets.liabilitiesValue.toLocaleString()}
                                </span>
                              </div>
                              <div className="grid gap-2">
                                {assets.liabilities.map((liability) => (
                                  <div key={liability.id} className="flex items-center justify-between py-2 px-3 bg-rose-50 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-900">{liability.name}</span>
                                      {liability.liabilityType && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{liability.liabilityType}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-rose-600">
                                        -${convertToUSD(Number(liability.outstandingBalance) || 0, liability.currency).toLocaleString()}
                                      </p>
                                      {liability.interestRate && (
                                        <p className="text-xs text-slate-500">{Number(liability.interestRate)}% interest {liability.currency && liability.currency !== 'USD' ? `(${liability.currency})` : ''}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {/* Unassigned assets */}
          {(unassignedStocks.length > 0 || unassignedBonds.length > 0) && (
            <Card className="border-dashed">
              <Collapsible open={expandedAccounts['unassigned']} onOpenChange={() => toggleExpanded('unassigned')}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-xl">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-slate-500">Unassigned</CardTitle>
                          <p className="text-sm text-slate-400">Assets without an account</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-slate-600">
                            ${unassignedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-sm text-slate-500">
                            {unassignedStocks.length} stocks • {unassignedBonds.length} bonds
                          </p>
                        </div>
                        {expandedAccounts['unassigned'] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-6 pt-4">
                      {unassignedStocks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-sky-600" />
                            <h4 className="font-medium text-slate-700">Stocks</h4>
                          </div>
                          <AssetTable
                            columns={stockColumns}
                            data={unassignedStocks}
                            onEdit={undefined}
                            onDelete={undefined}
                            emptyMessage="No unassigned stocks"
                          />
                        </div>
                      )}
                      
                      {unassignedBonds.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Landmark className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-medium text-slate-700">Bonds</h4>
                          </div>
                          <div className="grid gap-2">
                            {unassignedBonds.map((bond) => (
                              <div key={bond.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-900">{bond.name}</span>
                                <p className="font-medium">
                                  ${convertToUSD(Number(bond.currentValue) || Number(bond.purchasePrice) || 0, bond.currency).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </div>

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={accounts.length}
          loading={accountsLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        {/* Add/Edit Account Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Edit Account' : 'Add Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Brokerage Account"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input
                  value={formData.institution || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                  placeholder="Fidelity, Schwab, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={formData.accountType || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last 4 Digits</Label>
                <Input
                  value={formData.accountNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  {formData.id ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.name}? Assets in this account will become unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
