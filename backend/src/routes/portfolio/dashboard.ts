import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals } from '../../types/index.js';
import { sendServerError, sendUnauthorized } from '../response.js';

const router = Router();

// GET /dashboard - Get all portfolio data for dashboard
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendUnauthorized(res);
    }

    // Fetch all asset types in parallel
    const [
      stocks,
      bonds,
      peFunds,
      peDeals,
      liquidFunds,
      cashDeposits,
      liabilities
    ] = await Promise.all([
      prisma.stock.findMany({ where: { userId } }),
      prisma.bond.findMany({ where: { userId } }),
      prisma.peFund.findMany({ where: { userId } }),
      prisma.peDeal.findMany({ where: { userId } }),
      prisma.liquidFund.findMany({ where: { userId } }),
      prisma.cashDeposit.findMany({ where: { userId } }),
      prisma.liability.findMany({ where: { userId } })
    ]);

    const portfolioData = {
      stocks: stocks.map(stock => serializeDecimals(stock)),
      bonds: bonds.map(bond => serializeDecimals(bond)),
      peFunds: peFunds.map(fund => serializeDecimals(fund)),
      peDeals: peDeals.map(deal => serializeDecimals(deal)),
      liquidFunds: liquidFunds.map(fund => serializeDecimals(fund)),
      cashDeposits: cashDeposits.map(deposit => serializeDecimals(deposit)),
      liabilities: liabilities.map(liability => serializeDecimals(liability))
    };

    res.json(portfolioData);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching portfolio data:', { error: err.message, userId: req.userId });
    sendServerError(res, 'Failed to fetch portfolio data');
  }
});

export default router;
