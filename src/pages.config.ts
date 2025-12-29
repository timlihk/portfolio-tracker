import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import __Layout from './Layout';

export type PageComponent = LazyExoticComponent<ComponentType<any>>;

export interface PagesConfig {
  mainPage: string;
  Pages: Record<string, PageComponent>;
  Layout?: ComponentType<{ currentPageName?: string; children: ReactNode }>;
}

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

export const PAGES: Record<string, PageComponent> = {
  Dashboard,
  Stocks,
  Bonds,
  PEFunds,
  PEDeals,
  LiquidFunds,
  Accounts,
  Changelog,
  Transactions,
  CashDeposits,
  Liabilities,
  Performance,
};

export const pagesConfig: PagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout as ComponentType<{ currentPageName?: string; children: ReactNode }>
};
