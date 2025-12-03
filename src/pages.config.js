import Dashboard from './pages/Dashboard';
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
import __Layout from './Layout.jsx';


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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};