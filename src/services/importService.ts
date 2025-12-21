/**
 * Universal CSV Import Service
 * 
 * Format-tolerant parser that works with Trading212, IBKR, and similar formats.
 * Uses column alias detection instead of exact column names.
 * 
 * Features:
 * - Flexible column detection via aliases
 * - Robust action recognition (buy/sell)
 * - Full precision quantity/price preservation
 * - Detailed import diagnostics
 */

import { Trade, TradeSource, AssetType } from '@/types/portfolio';

// ==================== COLUMN ALIASES ====================

const COLUMN_ALIASES = {
  // Action/Type column
  action: [
    'action', 'type', 'transaction', 'operation', 
    'trade type', 'order type', 'side', 'direction'
  ],
  
  // Ticker/Symbol - HIGHEST PRIORITY for symbol detection
  ticker: [
    'ticker', 'symbol', 'ticker symbol', 'stock symbol'
  ],
  
  // Instrument/Name - Secondary for symbol detection
  instrument: [
    'instrument', 'name', 'security', 'asset', 'stock', 
    'security name', 'description', 'company'
  ],
  
  // ISIN - Fallback identifier
  isin: [
    'isin', 'instrument id', 'security id', 'identifier', 
    'cusip', 'sedol', 'figi'
  ],
  
  // Quantity
  quantity: [
    'no. of shares', 'quantity', 'shares', 'units', 'amount',
    'qty', 'size', 'volume', 'no of shares', 'num shares',
    'share quantity', 'filled qty', 'executed qty'
  ],
  
  // Price
  price: [
    'price / share', 'price', 'execution price', 'unit price',
    'share price', 'avg price', 'fill price', 'price per share',
    'executed price', 'average price', 'cost basis'
  ],
  
  // Total value
  total: [
    'total', 'value', 'total value', 'amount', 'net amount',
    'gross amount', 'total cost', 'proceeds', 'cost'
  ],
  
  // Date/Time
  date: [
    'time', 'date', 'execution time', 'timestamp', 'trade date',
    'date/time', 'datetime', 'executed at', 'trade time',
    'settlement date', 'order date'
  ],
  
  // Currency
  currency: [
    'currency', 'base currency', 'ccy', 'currency code',
    'trade currency', 'settlement currency'
  ],
  
  // Fees
  fee: [
    'fee', 'commission', 'currency conversion fee', 'charges',
    'costs', 'comm/fee', 'fees', 'transaction fee', 'total fees'
  ],
};

// ==================== ACTION RECOGNITION ====================

const BUY_ACTIONS = [
  'buy', 'market buy', 'limit buy', 'purchase', 'bought', 
  'long', 'open', 'add', 'acquire'
];

const SELL_ACTIONS = [
  'sell', 'market sell', 'limit sell', 'sold', 'short',
  'sale', 'close', 'reduce', 'dispose'
];

const IGNORED_ACTIONS = [
  'deposit', 'withdrawal', 'withdraw',
  'dividend', 'dividends', 'div', 'distribution',
  'interest', 'lending interest', 'interest payment',
  'fx', 'fx conversion', 'currency conversion', 'forex',
  'fee', 'fees', 'commission', 'service fee',
  'tax', 'taxes', 'withholding tax', 'tax withheld',
  'transfer', 'internal transfer', 'account transfer',
  'split', 'stock split', 'reverse split',
  'merger', 'spinoff', 'spin-off', 'corporate action',
  'cash', 'cash in', 'cash out', 'cash deposit',
  'adjustment', 'correction', 'rebalance',
  'journal', 'journaling',
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if action is a valid trade action
 */
function isTradeAction(action: string): boolean {
  const normalized = normalize(action);
  return [...BUY_ACTIONS, ...SELL_ACTIONS].some(valid => 
    normalized.includes(valid) || valid.includes(normalized)
  );
}

/**
 * Check if action should be ignored
 */
function isIgnoredAction(action: string): boolean {
  const normalized = normalize(action);
  return IGNORED_ACTIONS.some(ignored => 
    normalized.includes(ignored) || normalized === ignored
  );
}

/**
 * Determine trade side from action string
 */
function getTradeSide(action: string): 'buy' | 'sell' | null {
  const normalized = normalize(action);
  
  if (BUY_ACTIONS.some(buy => normalized.includes(buy))) {
    return 'buy';
  }
  if (SELL_ACTIONS.some(sell => normalized.includes(sell))) {
    return 'sell';
  }
  return null;
}

/**
 * Detect if a symbol looks like crypto
 */
function detectAssetType(symbol: string): AssetType {
  const cryptoSymbols = [
    'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC',
    'ATOM', 'UNI', 'LTC', 'BCH', 'ALGO', 'FTM', 'NEAR', 'APE', 'SAND', 'MANA',
    'CRO', 'SHIB', 'TRX', 'ETC', 'XLM', 'VET', 'FIL', 'HBAR', 'ICP', 'AAVE',
    'XMR', 'OP', 'ARB', 'INJ', 'SUI', 'APT', 'PEPE', 'WIF', 'BONK'
  ];
  
  const upper = symbol.toUpperCase();
  
  // Check if it's a known crypto symbol
  if (cryptoSymbols.includes(upper)) {
    return 'crypto';
  }
  
  // Check for USDT suffix (crypto pairs)
  if (upper.endsWith('USDT') || upper.endsWith('USD') || upper.endsWith('BTC') || upper.endsWith('ETH')) {
    return 'crypto';
  }
  
  return 'stock';
}

// ==================== COLUMN DETECTION ====================

interface ColumnMap {
  action: number | null;
  ticker: number | null;
  instrument: number | null;
  isin: number | null;
  quantity: number | null;
  price: number | null;
  total: number | null;
  date: number | null;
  currency: number | null;
  fee: number | null;
}

/**
 * Detect column indices from headers
 */
function detectColumns(headers: string[]): ColumnMap {
  const columnMap: ColumnMap = {
    action: null,
    ticker: null,
    instrument: null,
    isin: null,
    quantity: null,
    price: null,
    total: null,
    date: null,
    currency: null,
    fee: null,
  };

  const normalizedHeaders = headers.map(h => normalize(h));

  // Match each field type against its aliases
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      
      // Skip if already matched to a higher priority field
      if (Object.values(columnMap).includes(i)) continue;
      
      // Exact match first
      if (aliases.includes(header)) {
        columnMap[field as keyof ColumnMap] = i;
        break;
      }
      
      // Partial match
      const partialMatch = aliases.find(alias => 
        header.includes(alias) || alias.includes(header)
      );
      if (partialMatch && columnMap[field as keyof ColumnMap] === null) {
        columnMap[field as keyof ColumnMap] = i;
      }
    }
  }

  return columnMap;
}

// ==================== VALUE PARSING ====================

/**
 * Parse numeric value with format handling
 */
function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value.trim() === '-') return null;
  
  let cleaned = value
    .replace(/[$€£¥₹₿]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle European format (1.234,56)
  const hasCommaDecimal = /\d,\d{1,2}$/.test(cleaned);
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  
  // Handle parentheses for negative numbers
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse date value
 */
function parseDate(value: string | undefined): Date {
  if (!value || value.trim() === '') return new Date();
  
  const trimmed = value.trim();
  
  // Try ISO format first
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return new Date();
}

/**
 * Clean and validate a symbol
 */
function cleanSymbol(value: string | undefined): string {
  if (!value) return '';
  
  let cleaned = value.trim().toUpperCase();
  
  // Remove common suffixes that aren't part of the symbol
  cleaned = cleaned.replace(/\s*(INC\.?|CORP\.?|LTD\.?|PLC\.?|CO\.?|CLASS [A-Z])$/i, '');
  
  // Remove exchange prefixes
  cleaned = cleaned.replace(/^(NYSE|NASDAQ|LSE|TSE|ASX):/i, '');
  
  return cleaned.trim();
}

// ==================== CSV PARSING ====================

/**
 * Parse a CSV line handling quotes properly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// ==================== MAIN PARSER ====================

export interface ImportDiagnostics {
  totalRows: number;
  tradesImported: number;
  rowsSkipped: number;
  skipReasons: Record<string, number>;
  warnings: string[];
}

export interface ParseResult {
  trades: Trade[];
  errors: string[];
  diagnostics: ImportDiagnostics;
}

/**
 * Parse a CSV file with flexible column detection
 */
export function parseFlexibleCSV(
  csvContent: string,
  source: TradeSource = 'trading212'
): ParseResult {
  const trades: Trade[] = [];
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const warnings: string[] = [];
  
  const addSkipReason = (reason: string) => {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  };

  try {
    // Split into lines and filter empty
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      errors.push('CSV file is empty or has no data rows');
      return {
        trades,
        errors,
        diagnostics: {
          totalRows: 0,
          tradesImported: 0,
          rowsSkipped: 0,
          skipReasons,
          warnings,
        },
      };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    const columns = detectColumns(headers);

    // Log detected columns for debugging
    console.log('Detected columns:', columns);
    console.log('Headers:', headers);

    // Check for minimum required columns
    const hasSymbolColumn = columns.ticker !== null || columns.instrument !== null || columns.isin !== null;
    const hasQuantityColumn = columns.quantity !== null;
    
    if (!hasSymbolColumn) {
      errors.push('Could not detect symbol/ticker column. Headers: ' + headers.join(', '));
      return {
        trades,
        errors,
        diagnostics: {
          totalRows: lines.length - 1,
          tradesImported: 0,
          rowsSkipped: lines.length - 1,
          skipReasons,
          warnings,
        },
      };
    }

    if (!hasQuantityColumn) {
      warnings.push('Could not detect quantity column - will try to infer from data');
    }

    let dataRowCount = 0;

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      dataRowCount++;

      try {
        const values = parseCSVLine(line);

        // Get action
        const actionValue = columns.action !== null ? values[columns.action] : '';
        const action = actionValue?.trim() || '';

        // Skip ignored actions
        if (action && isIgnoredAction(action)) {
          addSkipReason(`Ignored: ${action.substring(0, 20)}`);
          continue;
        }

        // Determine trade side
        let side: 'buy' | 'sell' | null = null;
        
        if (action) {
          side = getTradeSide(action);
          if (!side && !isTradeAction(action)) {
            addSkipReason(`Unknown action: ${action.substring(0, 20)}`);
            continue;
          }
        }

        // Infer from quantity sign if no action
        if (!side && columns.quantity !== null) {
          const qty = parseNumber(values[columns.quantity]);
          if (qty !== null) {
            side = qty < 0 ? 'sell' : 'buy';
          }
        }

        if (!side) {
          addSkipReason('Could not determine buy/sell');
          continue;
        }

        // Get symbol - priority: ticker > instrument > isin
        const ticker = columns.ticker !== null ? cleanSymbol(values[columns.ticker]) : '';
        const instrument = columns.instrument !== null ? cleanSymbol(values[columns.instrument]) : '';
        const isin = columns.isin !== null ? values[columns.isin]?.trim().toUpperCase() : undefined;

        // Use first available symbol
        const symbol = ticker || instrument || isin || '';

        if (!symbol) {
          addSkipReason('Missing symbol');
          continue;
        }

        // Get quantity (absolute value)
        const rawQuantity = columns.quantity !== null ? parseNumber(values[columns.quantity]) : null;
        const quantity = rawQuantity !== null ? Math.abs(rawQuantity) : 0;

        if (quantity <= 0) {
          addSkipReason('Invalid quantity');
          continue;
        }

        // Get price
        let price = columns.price !== null ? parseNumber(values[columns.price]) : null;
        
        // Calculate from total if no direct price
        if ((price === null || price <= 0) && columns.total !== null) {
          const total = parseNumber(values[columns.total]);
          if (total !== null && quantity > 0) {
            price = Math.abs(total) / quantity;
          }
        }

        if (price === null || price <= 0) {
          addSkipReason('Invalid price');
          continue;
        }

        // Get optional fields
        const dateValue = columns.date !== null ? values[columns.date] : undefined;
        const date = parseDate(dateValue);
        
        const currency = columns.currency !== null 
          ? values[columns.currency]?.trim().toUpperCase() 
          : undefined;
          
        const fee = columns.fee !== null 
          ? Math.abs(parseNumber(values[columns.fee]) || 0) 
          : 0;

        // Detect asset type
        const assetType = detectAssetType(symbol);

        // Create normalized trade
        const trade: Trade = {
          id: `${source}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          assetType,
          side,
          quantity,
          price,
          fee,
          date,
          source,
        };

        trades.push(trade);
      } catch (e) {
        errors.push(`Row ${i + 1}: Parse error`);
        addSkipReason('Parse error');
      }
    }

    // Add warning if no trades found
    if (trades.length === 0 && dataRowCount > 0) {
      warnings.push(`0 trades detected from ${dataRowCount} rows. Check if the CSV format is supported.`);
    }

    // Log summary
    console.log(`Import complete: ${trades.length} trades from ${dataRowCount} rows`);
    Object.entries(skipReasons).forEach(([reason, count]) => {
      console.log(`  Skipped: ${reason} (${count})`);
    });

    return {
      trades,
      errors,
      diagnostics: {
        totalRows: dataRowCount,
        tradesImported: trades.length,
        rowsSkipped: dataRowCount - trades.length,
        skipReasons,
        warnings,
      },
    };
  } catch (e) {
    errors.push('Failed to parse CSV: ' + (e instanceof Error ? e.message : 'Unknown error'));
    return {
      trades,
      errors,
      diagnostics: {
        totalRows: 0,
        tradesImported: 0,
        rowsSkipped: 0,
        skipReasons,
        warnings,
      },
    };
  }
}

// ==================== LEGACY EXPORTS ====================

export { parseFlexibleCSV as parseTrading212CSV };

/**
 * Parse IBKR CSV export
 */
export function parseIBKRCSV(csvContent: string): ParseResult {
  // IBKR has section headers - try to extract trades section
  const lines = csvContent.split(/\r?\n/);
  let tradesSection = '';
  let isTradesSection = false;
  let foundTradesHeader = false;

  for (const line of lines) {
    if (line.startsWith('Trades,Header')) {
      isTradesSection = true;
      foundTradesHeader = true;
      tradesSection = line.replace('Trades,Header,', '') + '\n';
      continue;
    }
    
    if (isTradesSection) {
      if (line.startsWith('Trades,Data')) {
        tradesSection += line.replace('Trades,Data,', '') + '\n';
      } else if (line.startsWith('Trades,Total') || line.startsWith('Trades,SubTotal')) {
        continue;
      } else if (line.trim() === '' || line.startsWith(',')) {
        break;
      }
    }
  }

  if (foundTradesHeader && tradesSection) {
    return parseFlexibleCSV(tradesSection, 'ibkr');
  }

  return parseFlexibleCSV(csvContent, 'ibkr');
}

// ==================== DUPLICATE DETECTION ====================

/**
 * Find duplicate trades between new and existing
 */
export function findDuplicates(newTrades: Trade[], existingTrades: Trade[]): Trade[] {
  return newTrades.filter(newTrade => {
    return existingTrades.some(existing => 
      existing.symbol === newTrade.symbol &&
      existing.side === newTrade.side &&
      Math.abs(existing.quantity - newTrade.quantity) < 0.0001 &&
      Math.abs(existing.price - newTrade.price) < 0.01 &&
      Math.abs(existing.date.getTime() - newTrade.date.getTime()) < 60000
    );
  });
}

export interface ImportResult {
  tradesAdded: number;
  tradesSkipped: number;
  errors: string[];
}

/**
 * Import trades with duplicate detection
 */
export function importTrades(
  newTrades: Trade[],
  existingTrades: Trade[]
): ImportResult {
  const duplicates = findDuplicates(newTrades, existingTrades);
  const uniqueTrades = newTrades.filter(t => !duplicates.includes(t));

  return {
    tradesAdded: uniqueTrades.length,
    tradesSkipped: duplicates.length,
    errors: [],
  };
}
