import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Trade, TradeSource } from '@/types/portfolio';
import { normalizeToTicker } from './importService';

interface PortfolioDBSchema extends DBSchema {
  trades: {
    key: string;
    value: Trade;
    indexes: {
      'by-symbol': string;
      'by-source': TradeSource;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      portfolioName?: string;
      baseCurrency?: string;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'portfolio-tracker';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PortfolioDBSchema> | null = null;

async function getDb(): Promise<IDBPDatabase<PortfolioDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PortfolioDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Trades store
      if (!db.objectStoreNames.contains('trades')) {
        const tradesStore = db.createObjectStore('trades', { keyPath: 'id' });
        tradesStore.createIndex('by-symbol', 'symbol');
        tradesStore.createIndex('by-source', 'source');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ==================== TRADES ====================

export async function fetchTrades(): Promise<Trade[]> {
  const db = await getDb();
  const trades = await db.getAll('trades');
  
  // Convert date strings back to Date objects
  return trades.map(trade => ({
    ...trade,
    date: new Date(trade.date),
  }));
}

export async function addTrade(trade: Trade): Promise<void> {
  const db = await getDb();
  await db.put('trades', {
    ...trade,
    date: trade.date instanceof Date ? trade.date : new Date(trade.date),
  });
}

export async function addTrades(trades: Trade[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('trades', 'readwrite');
  
  for (const trade of trades) {
    await tx.store.put({
      ...trade,
      date: trade.date instanceof Date ? trade.date : new Date(trade.date),
    });
  }
  
  await tx.done;
}

export async function deleteTrade(tradeId: string): Promise<void> {
  const db = await getDb();
  await db.delete('trades', tradeId);
}

export async function deleteTradesBySymbol(symbol: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('trades', 'readwrite');
  const index = tx.store.index('by-symbol');
  
  let cursor = await index.openCursor(symbol);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  
  await tx.done;
}

export async function deleteTradesBySource(source: TradeSource): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('trades', 'readwrite');
  const index = tx.store.index('by-source');
  
  let cursor = await index.openCursor(source);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  
  await tx.done;
}

export async function clearAllTrades(): Promise<void> {
  const db = await getDb();
  await db.clear('trades');
}

// ==================== SETTINGS ====================

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const result = await db.get('settings', key);
  return result ? (result.value as T) : null;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}

// ==================== METADATA ====================

export async function getMetadata(): Promise<{ portfolioName: string; baseCurrency: string } | null> {
  const db = await getDb();
  const result = await db.get('metadata', 'portfolio');
  if (!result) return null;
  return {
    portfolioName: result.portfolioName || 'My Portfolio',
    baseCurrency: result.baseCurrency || 'USD',
  };
}

export async function setMetadata(data: { portfolioName?: string; baseCurrency?: string }): Promise<void> {
  const db = await getDb();
  const existing = await db.get('metadata', 'portfolio');
  await db.put('metadata', {
    key: 'portfolio',
    portfolioName: data.portfolioName ?? existing?.portfolioName ?? 'My Portfolio',
    baseCurrency: data.baseCurrency ?? existing?.baseCurrency ?? 'USD',
    updatedAt: Date.now(),
  });
}

// ==================== MIGRATION ====================

/**
 * Migrate existing trades to use proper ticker symbols
 * Converts company names like "APPLE" to "AAPL"
 */
export async function migrateSymbolsToTickers(): Promise<{ migrated: number; total: number }> {
  const db = await getDb();
  const trades = await db.getAll('trades');
  
  let migrated = 0;
  const tx = db.transaction('trades', 'readwrite');
  
  for (const trade of trades) {
    const normalizedSymbol = normalizeToTicker(trade.symbol);
    
    if (normalizedSymbol !== trade.symbol) {
      console.log(`Migrating symbol: ${trade.symbol} -> ${normalizedSymbol}`);
      await tx.store.put({
        ...trade,
        symbol: normalizedSymbol,
      });
      migrated++;
    }
  }
  
  await tx.done;
  
  if (migrated > 0) {
    console.log(`Migration complete: ${migrated}/${trades.length} trades updated`);
  }
  
  return { migrated, total: trades.length };
}
