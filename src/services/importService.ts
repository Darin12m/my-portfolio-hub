import { Trade, TradeSource } from '@/types/portfolio';

// ==================== COLUMN ALIASES ====================
// Each field can be matched by multiple column name variations

const COLUMN_ALIASES = {
  action: ['action', 'type', 'transaction', 'operation', 'trade type', 'order type'],
  // IMPORTANT: 'ticker' and 'symbol' must come BEFORE 'name' to prioritize actual ticker symbols
  ticker: ['ticker', 'symbol'], // Priority column for actual ticker symbols
  name: ['name', 'security', 'instrument', 'asset', 'stock'], // Secondary - company names
  isin: ['isin', 'instrument id', 'security id', 'identifier'],
  quantity: ['no. of shares', 'quantity', 'shares', 'units', 'amount', 'qty', 'size', 'volume'],
  price: ['price / share', 'price', 'execution price', 'unit price', 'share price', 'avg price', 'fill price'],
  total: ['total', 'value', 'total value', 'amount', 'net amount', 'gross amount'],
  date: ['time', 'date', 'execution time', 'timestamp', 'trade date', 'date/time', 'datetime', 'executed at'],
  currency: ['currency', 'base currency', 'ccy', 'currency code'],
  fee: ['fee', 'commission', 'currency conversion fee', 'charges', 'costs', 'comm/fee'],
};

// ==================== ACTION RECOGNITION ====================

const BUY_ACTIONS = ['buy', 'market buy', 'limit buy', 'purchase', 'bought', 'long'];
const SELL_ACTIONS = ['sell', 'market sell', 'limit sell', 'sold', 'short', 'sale'];
const VALID_TRADE_ACTIONS = [...BUY_ACTIONS, ...SELL_ACTIONS];

const IGNORED_ACTIONS = [
  'deposit', 'withdrawal', 'withdraw',
  'dividend', 'dividends', 'div',
  'interest', 'lending interest',
  'fx', 'fx conversion', 'currency conversion', 'forex',
  'fee', 'fees', 'commission',
  'tax', 'taxes', 'withholding tax',
  'transfer', 'internal transfer',
  'split', 'stock split', 'reverse split',
  'merger', 'spinoff', 'corporate action',
  'cash', 'cash in', 'cash out',
  'adjustment', 'correction',
];

/**
 * Normalize a string for comparison (lowercase, trimmed, remove extra spaces)
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if an action is a valid trade action
 */
function isTradeAction(action: string): boolean {
  const normalized = normalize(action);
  return VALID_TRADE_ACTIONS.some(valid => normalized.includes(valid) || valid.includes(normalized));
}

/**
 * Check if an action should be ignored
 */
function isIgnoredAction(action: string): boolean {
  const normalized = normalize(action);
  return IGNORED_ACTIONS.some(ignored => normalized.includes(ignored) || normalized === ignored);
}

/**
 * Determine trade side from action string
 */
function getTradeSide(action: string): 'buy' | 'sell' | null {
  const normalized = normalize(action);
  
  if (BUY_ACTIONS.some(buy => normalized.includes(buy) || buy.includes(normalized))) {
    return 'buy';
  }
  if (SELL_ACTIONS.some(sell => normalized.includes(sell) || sell.includes(normalized))) {
    return 'sell';
  }
  return null;
}

// ==================== COLUMN DETECTION ====================

interface ColumnMap {
  action: number | null;
  ticker: number | null;  // Actual ticker symbol column
  name: number | null;    // Company name column
  isin: number | null;
  quantity: number | null;
  price: number | null;
  total: number | null;
  date: number | null;
  currency: number | null;
  fee: number | null;
}

/**
 * Detect column indices by matching headers against known aliases
 */
function detectColumns(headers: string[]): ColumnMap {
  const columnMap: ColumnMap = {
    action: null,
    ticker: null,
    name: null,
    isin: null,
    quantity: null,
    price: null,
    total: null,
    date: null,
    currency: null,
    fee: null,
  };

  const normalizedHeaders = headers.map(h => normalize(h));

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      
      // Exact match first
      if (aliases.includes(header)) {
        columnMap[field as keyof ColumnMap] = i;
        break;
      }
      
      // Partial match (header contains alias or alias contains header)
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
 * Parse a numeric value safely, handling different formats
 */
function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove currency symbols, spaces, and handle different decimal separators
  let cleaned = value
    .replace(/[$€£¥₹]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle European format (1.234,56) vs US format (1,234.56)
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
 * Parse a date value safely
 */
function parseDate(value: string | undefined): Date {
  if (!value || value.trim() === '') return new Date();
  
  const trimmed = value.trim();
  
  // Try direct parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Try common formats
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return new Date();
}

// ==================== CSV PARSING ====================

/**
 * Parse a CSV line, handling quoted values properly
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
        // Escaped quote
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

export interface ParseResult {
  trades: Trade[];
  errors: string[];
  stats: {
    totalRows: number;
    tradesFound: number;
    rowsSkipped: number;
    skipReasons: Record<string, number>;
  };
}

/**
 * Parse a CSV file with flexible column detection
 * Works with Trading212, IBKR, and similar broker formats
 */
export function parseFlexibleCSV(
  csvContent: string,
  source: TradeSource = 'trading212'
): ParseResult {
  const trades: Trade[] = [];
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  
  const addSkipReason = (reason: string) => {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  };

  try {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) {
      errors.push('CSV file is empty or has no data rows');
      return { trades, errors, stats: { totalRows: 0, tradesFound: 0, rowsSkipped: 0, skipReasons } };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    const columns = detectColumns(headers);

    // Validate we have minimum required columns
    if (columns.action === null && columns.ticker === null && columns.name === null) {
      errors.push('Could not detect required columns (action or symbol/name). Headers found: ' + headers.join(', '));
      return { trades, errors, stats: { totalRows: lines.length - 1, tradesFound: 0, rowsSkipped: lines.length - 1, skipReasons } };
    }

    let dataRowCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      dataRowCount++;

      try {
        const values = parseCSVLine(line);

        // Get action value
        const actionValue = columns.action !== null ? values[columns.action] : '';
        const action = actionValue?.trim() || '';

        // Skip if action is explicitly ignored
        if (action && isIgnoredAction(action)) {
          addSkipReason(`Non-trade action: ${action}`);
          continue;
        }

        // Determine trade side
        let side: 'buy' | 'sell' | null = null;
        
        if (action) {
          side = getTradeSide(action);
          if (!side && !isTradeAction(action)) {
            addSkipReason(`Unrecognized action: ${action}`);
            continue;
          }
        }

        // If no action column, try to infer from quantity sign or other indicators
        if (!side && columns.quantity !== null) {
          const qty = parseNumber(values[columns.quantity]);
          if (qty !== null && qty < 0) {
            side = 'sell';
          } else if (qty !== null && qty > 0) {
            side = 'buy';
          }
        }

        // Skip if we can't determine trade side
        if (!side) {
          addSkipReason('Could not determine buy/sell');
          continue;
        }

        // Get symbol - prioritize ticker column, then ISIN, then name as last resort
        const ticker = columns.ticker !== null ? values[columns.ticker]?.trim().toUpperCase() : '';
        const name = columns.name !== null ? values[columns.name]?.trim() : '';
        const isin = columns.isin !== null ? values[columns.isin]?.trim().toUpperCase() : undefined;

        // Use ticker if available, otherwise fall back to name or ISIN
        const symbol = ticker || '';

        // Must have ticker, name, or ISIN
        if (!ticker && !name && !isin) {
          addSkipReason('Missing symbol/ISIN');
          continue;
        }

        // Get quantity (must be positive)
        const rawQuantity = columns.quantity !== null ? parseNumber(values[columns.quantity]) : null;
        const quantity = rawQuantity !== null ? Math.abs(rawQuantity) : 0;

        if (quantity <= 0) {
          addSkipReason('Invalid quantity');
          continue;
        }

        // Get price
        let price = columns.price !== null ? parseNumber(values[columns.price]) : null;
        
        // If no direct price, try to calculate from total / quantity
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
        
        const currency = columns.currency !== null ? values[columns.currency]?.trim().toUpperCase() : undefined;
        const fee = columns.fee !== null ? parseNumber(values[columns.fee]) || 0 : 0;

        // Create trade object - use ticker if available, else ISIN, else name
        // The symbol should be the actual ticker for price lookup to work
        const finalSymbol = ticker || isin || name.toUpperCase() || 'UNKNOWN';
        
        const trade: Trade = {
          id: `${source}_${Date.now()}_${i}`,
          symbol: finalSymbol,
          assetType: 'stock', // Default to stock, can be enhanced later
          side,
          quantity, // Full precision preserved
          price,    // Full precision preserved
          fee: Math.abs(fee),
          date,
          source,
        };

        trades.push(trade);
      } catch (e) {
        errors.push(`Row ${i + 1}: Parse error`);
        addSkipReason('Parse error');
      }
    }

    // Generate summary of skip reasons
    const skipSummary = Object.entries(skipReasons)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(', ');
    
    if (skipSummary) {
      errors.push(`Skipped rows - ${skipSummary}`);
    }

    return {
      trades,
      errors,
      stats: {
        totalRows: dataRowCount,
        tradesFound: trades.length,
        rowsSkipped: dataRowCount - trades.length,
        skipReasons,
      },
    };
  } catch (e) {
    errors.push('Failed to parse CSV file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    return { trades, errors, stats: { totalRows: 0, tradesFound: 0, rowsSkipped: 0, skipReasons } };
  }
}

// ==================== LEGACY COMPATIBILITY ====================

// Re-export for backward compatibility with existing code
export { parseFlexibleCSV as parseTrading212CSV };

/**
 * Parse IBKR CSV export (uses flexible parser with IBKR source)
 */
export function parseIBKRCSV(csvContent: string): { trades: Trade[]; errors: string[] } {
  // IBKR has a special format with section headers
  // Try to extract just the trades section
  const lines = csvContent.split(/\r?\n/);
  let tradesSection = '';
  let isTradesSection = false;
  let foundTradesHeader = false;

  for (const line of lines) {
    if (line.startsWith('Trades,Header')) {
      isTradesSection = true;
      foundTradesHeader = true;
      // Extract headers
      tradesSection = line.replace('Trades,Header,', '') + '\n';
      continue;
    }
    
    if (isTradesSection) {
      if (line.startsWith('Trades,Data')) {
        tradesSection += line.replace('Trades,Data,', '') + '\n';
      } else if (line.startsWith('Trades,Total') || line.startsWith('Trades,SubTotal')) {
        // Skip total rows
        continue;
      } else if (line.trim() === '' || line.startsWith(',')) {
        // End of trades section
        break;
      }
    }
  }

  if (foundTradesHeader && tradesSection) {
    const result = parseFlexibleCSV(tradesSection, 'ibkr');
    return { trades: result.trades, errors: result.errors };
  }

  // Fallback: try parsing the whole file
  const result = parseFlexibleCSV(csvContent, 'ibkr');
  return { trades: result.trades, errors: result.errors };
}

// ==================== DUPLICATE DETECTION ====================

export function findDuplicates(newTrades: Trade[], existingTrades: Trade[]): Trade[] {
  return newTrades.filter(newTrade => {
    return existingTrades.some(existing => 
      existing.symbol === newTrade.symbol &&
      existing.side === newTrade.side &&
      Math.abs(existing.quantity - newTrade.quantity) < 0.0001 &&
      Math.abs(existing.price - newTrade.price) < 0.01 &&
      Math.abs(existing.date.getTime() - newTrade.date.getTime()) < 60000 // Within 1 minute
    );
  });
}

export interface ImportResult {
  tradesAdded: number;
  tradesSkipped: number;
  errors: string[];
}

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
