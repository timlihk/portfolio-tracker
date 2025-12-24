import express, { Response } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { serializeDecimals } from '../../types/index.js';
import type { AuthRequest, Stock, Bond, PeFund, PeDeal, LiquidFund, CashDeposit, Liability } from '../../types/index.js';
import { sendServerError } from '../response.js';

const router = express.Router();

interface Allocation {
  name: string;
  value: number;
}

interface RiskFlag {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

function sumSafe(values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

function stockValueUSD(stock: Stock): number {
  const shares = Number(stock.shares) || 0;
  const price = Number(stock.currentPrice) || Number(stock.averageCost) || 0;
  return shares * price;
}

function bondValueUSD(bond: Bond): number {
  return Number(bond.currentValue) || Number(bond.purchasePrice) || 0;
}

function peFundValueUSD(fund: PeFund): number {
  const nav = Number(fund.nav) || 0;
  const dist = Number(fund.distributions) || 0;
  return nav + dist;
}

function peDealValueUSD(deal: PeDeal): number {
  return Number(deal.currentValue) || Number(deal.investmentAmount) || 0;
}

function liquidFundValueUSD(fund: LiquidFund): number {
  return Number(fund.currentValue) || Number(fund.investmentAmount) || 0;
}

function liabilityValueUSD(liability: Liability): number {
  return Number(liability.outstandingBalance) || 0;
}

// GET /portfolio/insights - aggregated portfolio metrics and risk flags
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [
      stocksRaw,
      bondsRaw,
      peFundsRaw,
      peDealsRaw,
      liquidFundsRaw,
      cashDepositsRaw,
      liabilitiesRaw
    ] = await Promise.all([
      prisma.stock.findMany({ where: { userId } }),
      prisma.bond.findMany({ where: { userId } }),
      prisma.peFund.findMany({ where: { userId } }),
      prisma.peDeal.findMany({ where: { userId } }),
      prisma.liquidFund.findMany({ where: { userId } }),
      prisma.cashDeposit.findMany({ where: { userId } }),
      prisma.liability.findMany({ where: { userId } })
    ]);

    const stocks = stocksRaw.map(serializeDecimals) as Stock[];
    const bonds = bondsRaw.map(serializeDecimals) as Bond[];
    const peFunds = peFundsRaw.map(serializeDecimals) as PeFund[];
    const peDeals = peDealsRaw.map(serializeDecimals) as PeDeal[];
    const liquidFunds = liquidFundsRaw.map(serializeDecimals) as LiquidFund[];
    const cashDeposits = cashDepositsRaw.map(serializeDecimals) as CashDeposit[];
    const liabilities = liabilitiesRaw.map(serializeDecimals) as Liability[];

    const stocksValue = sumSafe(stocks.map(stockValueUSD));
    const bondsValue = sumSafe(bonds.map(bondValueUSD));
    const peFundsValue = sumSafe(peFunds.map(peFundValueUSD));
    const peDealsValue = sumSafe(peDeals.map(peDealValueUSD));
    const liquidFundsValue = sumSafe(liquidFunds.map(liquidFundValueUSD));
    const cashValue = sumSafe(cashDeposits.map(c => c.amount));
    const totalLiabilities = sumSafe(liabilities.map(liabilityValueUSD));

    const totalAssets = stocksValue + bondsValue + peFundsValue + peDealsValue + liquidFundsValue + cashValue;
    const netWorth = totalAssets - totalLiabilities;

    const allocation: Allocation[] = [
      { name: 'Stocks', value: stocksValue },
      { name: 'Bonds', value: bondsValue },
      { name: 'Cash & Deposits', value: cashValue },
      { name: 'Liquid Funds', value: liquidFundsValue },
      { name: 'PE Funds', value: peFundsValue },
      { name: 'PE Deals', value: peDealsValue }
    ].filter(a => a.value > 0);

    // Concentration flag
    const positions = [
      ...stocks.map(s => ({ label: s.ticker || s.companyName || 'Stock', value: stockValueUSD(s) })),
      ...bonds.map(b => ({ label: b.name || 'Bond', value: bondValueUSD(b) })),
      ...peFunds.map(f => ({ label: f.fundName || 'PE Fund', value: peFundValueUSD(f) })),
      ...peDeals.map(d => ({ label: d.companyName || 'PE Deal', value: peDealValueUSD(d) })),
      ...liquidFunds.map(f => ({ label: f.fundName || 'Liquid Fund', value: liquidFundValueUSD(f) }))
    ].filter(p => p.value > 0);

    const topPosition = positions.sort((a, b) => b.value - a.value)[0];
    const concentrationRatio = totalAssets > 0 && topPosition ? topPosition.value / totalAssets : 0;

    const illiquidValue = peFundsValue + peDealsValue + liquidFundsValue;
    const illiquidRatio = totalAssets > 0 ? illiquidValue / totalAssets : 0;

    const nonUsdValue = allocation
      .filter(() => true) // placeholder if future FX is added; currently no per-currency conversion
      .reduce((sum, item) => sum + item.value, 0);

    const cashToLiabilityRatio = totalLiabilities > 0 ? cashValue / totalLiabilities : cashValue > 0 ? Infinity : 0;

    const riskFlags: RiskFlag[] = [];

    if (concentrationRatio >= 0.2 && topPosition) {
      riskFlags.push({
        id: 'concentration',
        label: 'Concentration',
        severity: concentrationRatio >= 0.4 ? 'high' : 'medium',
        message: `${topPosition.label} is ${(concentrationRatio * 100).toFixed(1)}% of assets`
      });
    }

    if (illiquidRatio >= 0.3) {
      riskFlags.push({
        id: 'illiquidity',
        label: 'Illiquid allocation',
        severity: illiquidRatio >= 0.5 ? 'high' : 'medium',
        message: `Illiquid assets are ${(illiquidRatio * 100).toFixed(1)}% of assets`
      });
    }

    if (totalLiabilities > 0 && cashToLiabilityRatio < 0.25) {
      riskFlags.push({
        id: 'liquidity',
        label: 'Low cash coverage',
        severity: 'high',
        message: `Cash covers ${(cashToLiabilityRatio * 100).toFixed(1)}% of liabilities`
      });
    }

    const response = {
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        netWorth,
        cash: cashValue
      },
      allocation,
      topPosition: topPosition ? { name: topPosition.label, value: topPosition.value } : null,
      illiquid: {
        value: illiquidValue,
        ratio: illiquidRatio
      },
      riskFlags
    };

    res.json(response);
  } catch (error) {
    return sendServerError(res, 'Failed to compute insights');
  }
});

export default router;
