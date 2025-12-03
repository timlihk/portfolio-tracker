import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useExchangeRates, useStockPrices } from '@/components/portfolio/useMarketData';

const ACCOUNT_TYPES = ['Brokerage', 'IRA', '401k', 'Roth IRA', 'Bank', 'Other'];

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});

  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => entities.Stock.list()
  });

  const { data: bonds = [] } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => entities.Bond.list()
  });

  const { data: liabilities = [] } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => entities.Liability.list()
  });

  const { data: cashDeposits = [] } = useQuery({
    queryKey: ['cashDeposits'],
    queryFn: () => entities.CashDeposit.list()
  });

  const { convertToUSD } = useExchangeRates();
  
  const stockTickers = stocks.map(s => s.ticker).filter(Boolean);
  const { prices: stockPrices } = useStockPrices(stockTickers);

  const createMutation = useMutation({
    mutationFn: (data) => entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleExpanded = (accountName) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountName]: !prev[accountName]
    }));
  };

  // Group assets by account - all values converted to USD
  const getAccountAssets = (accountName) => {
    const accountStocks = stocks.filter(s => s.account === accountName);
    const accountBonds = bonds.filter(b => b.account === accountName);
    const accountLiabilities = liabilities.filter(l => l.account === accountName && l.status !== 'Paid Off');
    const accountCash = cashDeposits.filter(c => c.account === accountName);
    
    const stocksValue = accountStocks.reduce((sum, s) => {
      const price = Number(stockPrices[s.ticker]?.price) || Number(s.current_price) || Number(s.average_cost) || 0;
      const value = Number(s.shares) * price;
      return sum + convertToUSD(value, s.currency);
    }, 0);
    const bondsValue = accountBonds.reduce((sum, b) => {
      const value = Number(b.current_value) || Number(b.purchase_price) || 0;
      return sum + convertToUSD(value, b.currency);
    }, 0);
    const liabilitiesValue = accountLiabilities.reduce((sum, l) => {
      return sum + convertToUSD(Number(l.outstanding_balance) || 0, l.currency);
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
      const price = Number(stockPrices[s.ticker]?.price) || Number(s.current_price) || Number(s.average_cost) || 0;
      return sum + convertToUSD(Number(s.shares) * price, s.currency);
    }, 0) +
    unassignedBonds.reduce((sum, b) => sum + convertToUSD(Number(b.current_value) || Number(b.purchase_price) || 0, b.currency), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
            <p className="text-slate-500 mt-1">{accounts.length} accounts</p>
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
                              {account.account_type && (
                                <Badge variant="secondary" className="text-xs">{account.account_type}</Badge>
                              )}
                              {account.account_number && (
                                <span className="text-xs text-slate-400">••••{account.account_number}</span>
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
                              <div className="grid gap-2">
                                {assets.stocks.map((stock) => (
                                  <div key={stock.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-900">{stock.ticker}</span>
                                      {stock.company_name && (
                                        <span className="text-slate-500 ml-2">{stock.company_name}</span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${convertToUSD(Number(stock.shares) * (Number(stockPrices[stock.ticker]?.price) || Number(stock.current_price) || Number(stock.average_cost) || 0), stock.currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                      <p className="text-xs text-slate-500">{Number(stock.shares).toLocaleString()} shares {stock.currency && stock.currency !== 'USD' ? `(${stock.currency})` : ''}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
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
                                      {bond.bond_type && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{bond.bond_type}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${convertToUSD(Number(bond.current_value) || Number(bond.purchase_price) || 0, bond.currency).toLocaleString()}
                                      </p>
                                      {bond.coupon_rate && (
                                        <p className="text-xs text-slate-500">{Number(bond.coupon_rate)}% coupon {bond.currency && bond.currency !== 'USD' ? `(${bond.currency})` : ''}</p>
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
                                      {deposit.deposit_type && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{deposit.deposit_type}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${convertToUSD(Number(deposit.amount) || 0, deposit.currency).toLocaleString()}
                                      </p>
                                      {deposit.interest_rate && (
                                        <p className="text-xs text-slate-500">{Number(deposit.interest_rate)}% interest {deposit.currency && deposit.currency !== 'USD' ? `(${deposit.currency})` : ''}</p>
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
                                      {liability.liability_type && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{liability.liability_type}</Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-rose-600">
                                        -${convertToUSD(Number(liability.outstanding_balance) || 0, liability.currency).toLocaleString()}
                                      </p>
                                      {liability.interest_rate && (
                                        <p className="text-xs text-slate-500">{Number(liability.interest_rate)}% interest {liability.currency && liability.currency !== 'USD' ? `(${liability.currency})` : ''}</p>
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
                          <div className="grid gap-2">
                            {unassignedStocks.map((stock) => (
                              <div key={stock.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                <div>
                                  <span className="font-medium text-slate-900">{stock.ticker}</span>
                                  {stock.company_name && (
                                    <span className="text-slate-500 ml-2">{stock.company_name}</span>
                                  )}
                                </div>
                                <p className="font-medium">
                                  ${convertToUSD(Number(stock.shares) * (Number(stockPrices[stock.ticker]?.price) || Number(stock.current_price) || Number(stock.average_cost) || 0), stock.currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            ))}
                          </div>
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
                                  ${convertToUSD(Number(bond.current_value) || Number(bond.purchase_price) || 0, bond.currency).toLocaleString()}
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
                  value={formData.account_type || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
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
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
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