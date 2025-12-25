import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stocks = lazy(() => import('./pages/Stocks'));
const Bonds = lazy(() => import('./pages/Bonds'));
const PEFunds = lazy(() => import('./pages/PEFunds'));
const PEDeals = lazy(() => import('./pages/PEDeals'));
const LiquidFunds = lazy(() => import('./pages/LiquidFunds'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Transactions = lazy(() => import('./pages/Transactions'));
const CashDeposits = lazy(() => import('./pages/CashDeposits'));
const Liabilities = lazy(() => import('./pages/Liabilities'));
const Performance = lazy(() => import('./pages/Performance'));

export const PAGES = {
  "Dashboard": Dashboard,
  "Stocks": Stocks,
  "Bonds": Bonds,
  "PEFunds": PEFunds,
  "PEDeals": PEDeals,
  "LiquidFunds": LiquidFunds,
  "Accounts": Accounts,
  "Changelog": Changelog,
  "Transactions": Transactions,
  "CashDeposits": CashDeposits,
  "Liabilities": Liabilities,
  "Performance": Performance,
};

export const pagesConfig = {
  mainPage: "Dashboard",
  Pages: PAGES,
  Layout: __Layout,
};
