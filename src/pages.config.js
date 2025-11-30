import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Bonds from './pages/Bonds';
import PEFunds from './pages/PEFunds';
import PEDeals from './pages/PEDeals';
import LiquidFunds from './pages/LiquidFunds';
import Accounts from './pages/Accounts';
import Changelog from './pages/Changelog';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};