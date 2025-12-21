import { Trade, ImportResult } from '@/types/portfolio';

// Valid Trading212 trade actions - only actual market trades
const VALID_T212_ACTIONS = ['market buy', 'market sell'];

// Parse Trading212 CSV export - imports RAW trades only
export function parseTrading212CSV(csvContent: string): { trades: Trade[]; errors: string[] } {
  const trades: Trade[] = [];
  const errors: string[] = [];
  
  try {
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase());
    
    if (!headers || headers.length === 0) {
      errors.push('Invalid CSV format: No headers found');
      return { trades, errors };
    }

    let skippedNonTrades = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx] || '']));

        const action = (row['action'] || '').toLowerCase().trim();
        
        // Only import Market buy and Market sell - skip all other actions
        if (!VALID_T212_ACTIONS.includes(action)) {
          skippedNonTrades++;
          continue;
        }

        const symbol = row['ticker'] || row['symbol'] || '';
        // Preserve full precision - no rounding
        const quantity = Number(row['no. of shares'] || row['quantity'] || '0');
        const price = Number(row['price / share'] || row['price'] || '0');
        const fee = Number(row['currency conversion fee'] || row['fee'] || '0');

        if (!symbol || quantity <= 0 || price <= 0) {
          errors.push(`Line ${i + 1}: Invalid trade data (symbol: ${symbol}, qty: ${quantity}, price: ${price})`);
          continue;
        }

        const trade: Trade = {
          id: `t212_${Date.now()}_${i}`,
          symbol,
          assetType: 'stock',
          side: action === 'market buy' ? 'buy' : 'sell',
          quantity, // Full precision preserved
          price,    // Full precision preserved
          fee,
          date: new Date(row['time'] || row['date'] || Date.now()),
          source: 'trading212',
        };

        trades.push(trade);
      } catch (e) {
        errors.push(`Line ${i + 1}: Failed to parse`);
      }
    }

    if (skippedNonTrades > 0) {
      errors.push(`Skipped ${skippedNonTrades} non-trade rows (deposits, dividends, etc.)`);
    }
  } catch (e) {
    errors.push('Failed to parse CSV file');
  }

  return { trades, errors };
}

// Parse IBKR CSV export
export function parseIBKRCSV(csvContent: string): { trades: Trade[]; errors: string[] } {
  const trades: Trade[] = [];
  const errors: string[] = [];
  
  try {
    const lines = csvContent.split('\n');
    let isTradesSection = false;
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // IBKR format has sections, look for Trades section
      if (line.startsWith('Trades,')) {
        isTradesSection = true;
        continue;
      }

      if (isTradesSection && line.startsWith('Trades,Header')) {
        headers = parseCSVLine(line.replace('Trades,Header,', ''));
        continue;
      }

      if (isTradesSection && line.startsWith('Trades,Data')) {
        try {
          const values = parseCSVLine(line.replace('Trades,Data,', ''));
          const row = Object.fromEntries(headers.map((h, idx) => [h.toLowerCase(), values[idx] || '']));

          const trade: Trade = {
            id: `ibkr_${Date.now()}_${i}`,
            symbol: (row['symbol'] || '').split(' ')[0],
            assetType: 'stock',
            side: (row['buy/sell'] || '').toLowerCase() === 'buy' ? 'buy' : 'sell',
            quantity: Math.abs(parseFloat(row['quantity'] || '0')),
            price: parseFloat(row['t. price'] || row['price'] || '0'),
            fee: Math.abs(parseFloat(row['comm/fee'] || '0')),
            date: new Date(row['date/time'] || row['date'] || Date.now()),
            source: 'ibkr',
          };

          if (trade.symbol && trade.quantity > 0 && trade.price > 0) {
            trades.push(trade);
          }
        } catch (e) {
          errors.push(`Line ${i + 1}: Failed to parse`);
        }
      }
    }
  } catch (e) {
    errors.push('Failed to parse IBKR CSV file');
  }

  return { trades, errors };
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
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

// Check for duplicate trades
export function findDuplicates(newTrades: Trade[], existingTrades: Trade[]): Trade[] {
  return newTrades.filter(newTrade => {
    return existingTrades.some(existing => 
      existing.symbol === newTrade.symbol &&
      existing.side === newTrade.side &&
      existing.quantity === newTrade.quantity &&
      existing.price === newTrade.price &&
      existing.date.getTime() === newTrade.date.getTime()
    );
  });
}

// Import trades with duplicate detection
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
