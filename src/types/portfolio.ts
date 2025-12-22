// Types for the stock portfolio tracking app
// STOCKS ONLY - no crypto

// Trade source types
export type TradeSource = 'csv' | 'manual' | 'trading212' | 'ibkr';

// Trade action types (matching broker CSV)
export type TradeAction = 'BUY' | 'SELL';

/**
 * Trade interface for local state and Firestore
 * Exactly matches the broker CSV structure
 */
export interface Trade {
  // Firestore document ID (auto-generated)
  id: string;
  
  // User scoping
  userId: string;
  
  // Broker identifiers
  brokerTransactionId: string;  // CSV: ID (for duplicate detection)
  
  // Trade data
  action: TradeAction;          // CSV: Action ("Market buy" → "BUY")
  timestamp: string;            // CSV: Time (ISO string)
  
  // Security info
  isin: string;                 // CSV: ISIN
  ticker: string;               // CSV: Ticker
  name: string;                 // CSV: Name
  
  // Quantities & Prices
  shares: number;               // CSV: No. of shares
  pricePerShare: number;        // CSV: Price / share
  priceCurrency: string;        // CSV: Currency (Price / share)
  
  // Totals
  totalValue: number;           // CSV: Total
  totalCurrency: string;        // CSV: Currency (Total)
  exchangeRate: number;         // CSV: Exchange rate
  
  // Metadata
  source: TradeSource;
  createdAt: Date | null;       // Firestore serverTimestamp()
}

/**
 * Holding representation for UI
 */
export interface Holding {
  ticker: string;
  name: string;
  isin?: string;
  logoUrl?: string;
  shares: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  holdingPeriodDays: number;
  allocationPercent: number;
}

/**
 * Live price data
 */
export interface LivePrice {
  ticker: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  timestamp: number;
  source: string;
}

/**
 * Import result summary
 */
export interface ImportResult {
  trades: Trade[];
  errors: string[];
  diagnostics: ImportDiagnostics;
}

export interface ImportDiagnostics {
  totalRows: number;
  tradesImported: number;
  rowsSkipped: number;
  skipReasons: Record<string, number>;
  warnings: string[];
  totalInvested: number;
  uniqueTickers: string[];
}
