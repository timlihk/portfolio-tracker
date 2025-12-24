import express from 'express';
import stocksRouter from './stocks.js';
import bondsRouter from './bonds.js';
import accountsRouter from './accounts.js';
import peFundsRouter from './pe-funds.js';
import peDealsRouter from './pe-deals.js';
import liquidFundsRouter from './liquid-funds.js';
import cashDepositsRouter from './cash-deposits.js';
import liabilitiesRouter from './liabilities.js';
import dashboardRouter from './dashboard.js';
import insightsRouter from './insights.js';

const router = express.Router();

// Mount sub-routers
router.use('/stocks', stocksRouter);
router.use('/bonds', bondsRouter);
router.use('/accounts', accountsRouter);
router.use('/pe-funds', peFundsRouter);
router.use('/pe-deals', peDealsRouter);
router.use('/liquid-funds', liquidFundsRouter);
router.use('/cash-deposits', cashDepositsRouter);
router.use('/liabilities', liabilitiesRouter);
router.use('/dashboard', dashboardRouter);
router.use('/insights', insightsRouter);

export default router;
