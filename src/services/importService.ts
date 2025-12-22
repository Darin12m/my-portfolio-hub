/**
 * CSV Import Service for Stock Portfolio
 * 
 * Parses Trading212 and IBKR CSV exports and maps to Firestore schema.
 * Features:
 * - Flexible column detection via aliases
 * - Skip Deposit/Dividend/etc rows
 * - Duplicate detection via brokerTransactionId
 * - Maps to exact Firestore schema
 */

import { Trade, TradeAction, TradeSource } from '@/types/portfolio';

// ==================== COLUMN ALIASES ====================

const COLUMN_ALIASES = {
  // Action/Type column
  action: [
    'action', 'type', 'transaction', 'operation', 
    'trade type', 'order type', 'side', 'direction'
  ],
  
  // Ticker/Symbol
  ticker: [
    'ticker', 'symbol', 'ticker symbol', 'stock symbol'
  ],
  
  // Instrument/Name
  name: [
    'name', 'instrument', 'security', 'asset', 'stock', 
    'security name', 'description', 'company'
  ],
  
  // ISIN
  isin: [
    'isin', 'instrument id', 'security id', 'identifier', 
    'cusip', 'sedol', 'figi'
  ],
  
  // Quantity - Trading212 uses "No. of shares"
  shares: [
    'no. of shares', 'quantity', 'shares', 'units',
    'qty', 'size', 'volume', 'no of shares', 'num shares',
    'share quantity', 'filled qty', 'executed qty'
  ],
  
  // Price - Trading212 uses "Price / share"
  pricePerShare: [
    'price / share', 'price', 'execution price', 'unit price',
    'share price', 'avg price', 'fill price', 'price per share',
    'executed price', 'average price', 'cost basis'
  ],
  
  // Currency for price
  priceCurrency: [
    'currency (price / share)', 'currency', 'base currency', 'ccy', 
    'currency code', 'trade currency'
  ],
  
  // Total value
  total: [
    'total', 'value', 'total value', 'net amount',
    'gross amount', 'total cost', 'proceeds', 'cost'
  ],
  
  // Currency for total
  totalCurrency: [
    'currency (total)', 'currency (result)', 'result currency',
    'settlement currency'
  ],
  
  // Exchange rate
  exchangeRate: [
    'exchange rate', 'fx rate', 'rate', 'conversion rate'
  ],
  
  // Date/Time
  time: [
    'time', 'date', 'execution time', 'timestamp', 'trade date',
    'date/time', 'datetime', 'executed at', 'trade time',
    'settlement date', 'order date'
  ],
  
  // Transaction ID
  id: [
    'id', 'transaction id', 'order id', 'trade id',
    'reference', 'ref', 'order number'
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

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isIgnoredAction(action: string): boolean {
  const normalized = normalize(action);
  return IGNORED_ACTIONS.some(ignored => 
    normalized.includes(ignored) || normalized === ignored
  );
}

function getTradeAction(action: string): TradeAction | null {
  const normalized = normalize(action);
  
  if (BUY_ACTIONS.some(buy => normalized.includes(buy))) {
    return 'BUY';
  }
  if (SELL_ACTIONS.some(sell => normalized.includes(sell))) {
    return 'SELL';
  }
  return null;
}

// ==================== COLUMN DETECTION ====================

interface ColumnMap {
  action: number | null;
  ticker: number | null;
  name: number | null;
  isin: number | null;
  shares: number | null;
  pricePerShare: number | null;
  priceCurrency: number | null;
  total: number | null;
  totalCurrency: number | null;
  exchangeRate: number | null;
  time: number | null;
  id: number | null;
}

function detectColumns(headers: string[]): ColumnMap {
  const columnMap: ColumnMap = {
    action: null,
    ticker: null,
    name: null,
    isin: null,
    shares: null,
    pricePerShare: null,
    priceCurrency: null,
    total: null,
    totalCurrency: null,
    exchangeRate: null,
    time: null,
    id: null,
  };

  const normalizedHeaders = headers.map(h => normalize(h));

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      
      if (Object.values(columnMap).includes(i)) continue;
      
      if (aliases.includes(header)) {
        columnMap[field as keyof ColumnMap] = i;
        break;
      }
      
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

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value.trim() === '-') return null;
  
  let cleaned = value
    .replace(/[$€£¥₹₿]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const hasCommaDecimal = /\d,\d{1,2}$/.test(cleaned);
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

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
  totalInvested: number;
  uniqueTickers: string[];
}

export interface ParseResult {
  trades: Omit<Trade, 'id' | 'userId' | 'createdAt'>[];
  errors: string[];
  diagnostics: ImportDiagnostics;
}

/**
 * Parse a CSV file and return trades matching Firestore schema
 */
export function parseCSV(
  csvContent: string,
  source: TradeSource = 'csv'
): ParseResult {
  const trades: Omit<Trade, 'id' | 'userId' | 'createdAt'>[] = [];
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const warnings: string[] = [];
  
  const addSkipReason = (reason: string) => {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  };

  try {
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
          totalInvested: 0,
          uniqueTickers: [],
        },
      };
    }

    const headers = parseCSVLine(lines[0]);
    const columns = detectColumns(headers);

    console.log('=== CSV Import Debug ===');
    console.log('Headers:', headers);
    console.log('Detected columns:', columns);

    const hasTickerColumn = columns.ticker !== null || columns.name !== null || columns.isin !== null;
    const hasSharesColumn = columns.shares !== null;
    
    if (!hasTickerColumn) {
      errors.push('Could not detect ticker/symbol column. Headers: ' + headers.join(', '));
      return {
        trades,
        errors,
        diagnostics: {
          totalRows: lines.length - 1,
          tradesImported: 0,
          rowsSkipped: lines.length - 1,
          skipReasons,
          warnings,
          totalInvested: 0,
          uniqueTickers: [],
        },
      };
    }

    if (!hasSharesColumn) {
      warnings.push('Could not detect shares/quantity column');
    }

    let dataRowCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      dataRowCount++;

      try {
        const values = parseCSVLine(line);

        // Get action
        const actionValue = columns.action !== null ? values[columns.action] : '';
        const action = actionValue?.trim() || '';

        // Skip ignored actions (Deposit, Dividend, etc.)
        if (action && isIgnoredAction(action)) {
          addSkipReason(`Ignored: ${action.substring(0, 20)}`);
          continue;
        }

        // Determine trade action (BUY/SELL)
        let tradeAction: TradeAction | null = null;
        
        if (action) {
          tradeAction = getTradeAction(action);
          if (!tradeAction) {
            addSkipReason(`Unknown action: ${action.substring(0, 20)}`);
            continue;
          }
        }

        // Infer from quantity sign if no action
        if (!tradeAction && columns.shares !== null) {
          const qty = parseNumber(values[columns.shares]);
          if (qty !== null) {
            tradeAction = qty < 0 ? 'SELL' : 'BUY';
          }
        }

        if (!tradeAction) {
          addSkipReason('Could not determine BUY/SELL');
          continue;
        }

        // Get ticker (priority: ticker > isin)
        const ticker = columns.ticker !== null 
          ? values[columns.ticker]?.trim().toUpperCase() 
          : '';
        
        // Get name
        const name = columns.name !== null 
          ? values[columns.name]?.trim() 
          : ticker;
        
        // Get ISIN
        const isin = columns.isin !== null 
          ? values[columns.isin]?.trim().toUpperCase() 
          : '';

        if (!ticker && !isin) {
          addSkipReason('Missing ticker/ISIN');
          continue;
        }

        // Get shares (absolute value)
        const rawShares = columns.shares !== null ? parseNumber(values[columns.shares]) : null;
        const shares = rawShares !== null ? Math.abs(rawShares) : 0;

        if (shares <= 0) {
          addSkipReason('Invalid shares');
          continue;
        }

        // Get price per share
        let pricePerShare = columns.pricePerShare !== null 
          ? parseNumber(values[columns.pricePerShare]) 
          : null;
        
        // Calculate from total if no direct price
        if ((pricePerShare === null || pricePerShare <= 0) && columns.total !== null) {
          const total = parseNumber(values[columns.total]);
          if (total !== null && shares > 0) {
            pricePerShare = Math.abs(total) / shares;
          }
        }

        if (pricePerShare === null || pricePerShare <= 0) {
          addSkipReason('Invalid price');
          continue;
        }

        // Get currencies
        const priceCurrency = columns.priceCurrency !== null 
          ? values[columns.priceCurrency]?.trim().toUpperCase() || 'USD'
          : 'USD';
          
        const totalCurrency = columns.totalCurrency !== null 
          ? values[columns.totalCurrency]?.trim().toUpperCase() || priceCurrency
          : priceCurrency;

        // Get total value
        const totalValue = columns.total !== null 
          ? Math.abs(parseNumber(values[columns.total]) || (shares * pricePerShare))
          : shares * pricePerShare;

        // Get exchange rate
        const exchangeRate = columns.exchangeRate !== null 
          ? parseNumber(values[columns.exchangeRate]) || 1
          : 1;

        // Get timestamp
        const timeValue = columns.time !== null ? values[columns.time] : undefined;
        const timestamp = timeValue ? new Date(timeValue).toISOString() : new Date().toISOString();

        // Get broker transaction ID
        const brokerTransactionId = columns.id !== null 
          ? values[columns.id]?.trim() 
          : `${source}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

        // Create trade matching Firestore schema
        const trade: Omit<Trade, 'id' | 'userId' | 'createdAt'> = {
          brokerTransactionId,
          action: tradeAction,
          timestamp,
          isin: isin || '',
          ticker: ticker || isin,
          name: name || ticker || isin,
          shares,
          pricePerShare,
          priceCurrency,
          totalValue,
          totalCurrency,
          exchangeRate,
          source,
        };

        trades.push(trade);
      } catch (e) {
        errors.push(`Row ${i + 1}: Parse error`);
        addSkipReason('Parse error');
      }
    }

    if (trades.length === 0 && dataRowCount > 0) {
      warnings.push(`0 trades detected from ${dataRowCount} rows. Check if the CSV format is supported.`);
    }

    const totalInvested = trades.reduce((sum, t) => {
      if (t.action === 'BUY') {
        return sum + (t.shares * t.pricePerShare);
      }
      return sum;
    }, 0);
    
    const uniqueTickers = [...new Set(trades.map(t => t.ticker))];

    console.log('=== Import Summary ===');
    console.log(`Total rows: ${dataRowCount}`);
    console.log(`Trades imported: ${trades.length}`);
    console.log(`Rows skipped: ${dataRowCount - trades.length}`);
    console.log(`Unique tickers: ${uniqueTickers.join(', ')}`);
    console.log(`Total invested: $${totalInvested.toFixed(2)}`);
    console.log('Skip reasons:', skipReasons);

    return {
      trades,
      errors,
      diagnostics: {
        totalRows: dataRowCount,
        tradesImported: trades.length,
        rowsSkipped: dataRowCount - trades.length,
        skipReasons,
        warnings,
        totalInvested,
        uniqueTickers,
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
        totalInvested: 0,
        uniqueTickers: [],
      },
    };
  }
}

/**
 * Parse IBKR CSV export (handles section headers)
 */
export function parseIBKRCSV(csvContent: string): ParseResult {
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
    return parseCSV(tradesSection, 'csv');
  }

  return parseCSV(csvContent, 'csv');
}

/**
 * Filter out trades that already exist (by brokerTransactionId)
 */
export function filterDuplicates(
  newTrades: Omit<Trade, 'id' | 'userId' | 'createdAt'>[],
  existingTransactionIds: Set<string>
): Omit<Trade, 'id' | 'userId' | 'createdAt'>[] {
  return newTrades.filter(trade => !existingTransactionIds.has(trade.brokerTransactionId));
}

// Legacy exports for compatibility
export { parseCSV as parseTrading212CSV };
export { parseCSV as parseFlexibleCSV };
