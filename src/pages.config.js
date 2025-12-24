import Dashboard from './pages/Dashboard';
import DashboardOption1 from './pages/DashboardOption1';
import DashboardV2 from './pages/DashboardV2';
import Stocks from './pages/Stocks';
import Bonds from './pages/Bonds';
import PEFunds from './pages/PEFunds';
import PEDeals from './pages/PEDeals';
import LiquidFunds from './pages/LiquidFunds';
import Accounts from './pages/Accounts';
import Changelog from './pages/Changelog';
import Transactions from './pages/Transactions';
import CashDeposits from './pages/CashDeposits';
import Liabilities from './pages/Liabilities';
import Performance from './pages/Performance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DashboardOption1": DashboardOption1,
    "DashboardV2": DashboardV2,
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};