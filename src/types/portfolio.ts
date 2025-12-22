// Types for the stock portfolio tracking app
// STOCKS ONLY - no crypto

import { Timestamp } from 'firebase/firestore';

// Trade source types
export type TradeSource = 'csv' | 'manual';

// Trade action types (matching broker CSV)
export type TradeAction = 'BUY' | 'SELL';

/**
 * Firestore Trade Document Schema
 * Exactly matches the broker CSV structure
 */
export interface FirestoreTrade {
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
  createdAt: Timestamp | null;  // Firestore serverTimestamp()
}

/**
 * Trade for local state (with Date instead of Timestamp)
 */
export interface Trade {
  id: string;
  userId: string;
  brokerTransactionId: string;
  action: TradeAction;
  timestamp: string;
  isin: string;
  ticker: string;
  name: string;
  shares: number;
  pricePerShare: number;
  priceCurrency: string;
  totalValue: number;
  totalCurrency: string;
  exchangeRate: number;
  source: TradeSource;
  createdAt: Date | null;
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
  tradesAdded: number;
  tradesSkipped: number;
  errors: string[];
}
