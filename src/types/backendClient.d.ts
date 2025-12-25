declare module '@/api/backendClient' {
  export type Pagination<T> = {
    data: T[];
    pagination?: { total?: number; page?: number; limit?: number };
  };

  export const authAPI: {
    register(userData: any): Promise<any>;
    login(credentials: any): Promise<any>;
    getProfile(): Promise<any>;
    setSharedSecret(secret: string): Promise<any>;
    clearSharedSecret(): Promise<any>;
  };

  export const portfolioAPI: any;
  export const pricingAPI: any;

  export const entities: {
    Account: any;
    Stock: any;
    Bond: any;
    PEFund: any;
    PEDeal: any;
    LiquidFund: any;
    CashDeposit: any;
    Liability: any;
    Transaction?: any;
    Changelog?: any;
  };

  export const backend: {
    entities: typeof entities;
    auth: typeof authAPI;
    pricing: typeof pricingAPI;
  };
}
