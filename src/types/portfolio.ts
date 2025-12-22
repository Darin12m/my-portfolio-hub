// Types for the portfolio tracking app

export type AssetType = 'stock' | 'crypto';
export type TradeSide = 'buy' | 'sell';
export type TradeSource = 'manual' | 'trading212' | 'ibkr' | 'binance' | 'gateio';

export interface Trade {
  id: string;
  symbol: string;
  assetType: AssetType;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  date: Date;
  source: TradeSource;
}

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: string;
  createdAt: Date;
  trades: Trade[];
}

export interface Holding {
  symbol: string;
  name: string;
  assetType: AssetType;
  isin?: string;
  logoUrl?: string;
  quantity: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  holdingPeriodDays: number;
  allocationPercent: number;
  cumulativeCashflowPerShare: number;
  valuePerShare: number;
}

export interface LivePrice {
  symbol: string;
  assetType: AssetType;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  timestamp: number;
  source: string;
}

export interface ExchangeConnection {
  id: string;
  exchange: 'binance' | 'gateio';
  apiKey: string;
  isConnected: boolean;
  lastSync?: Date;
}

export interface ImportResult {
  tradesAdded: number;
  tradesSkipped: number;
  errors: string[];
}
