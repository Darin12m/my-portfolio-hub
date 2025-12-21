import { Holding, Trade, LivePrice, AssetType } from '@/types/portfolio';

// Calculate average buy price for an asset
export function calculateAverageBuyPrice(trades: Trade[], symbol: string): number {
  const buyTrades = trades.filter(t => t.symbol === symbol && t.side === 'buy');
  if (buyTrades.length === 0) return 0;
  
  const totalCost = buyTrades.reduce((sum, t) => sum + (t.quantity * t.price) + t.fee, 0);
  const totalQuantity = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
  
  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}

// Calculate total quantity for an asset
export function calculateTotalQuantity(trades: Trade[], symbol: string): number {
  return trades
    .filter(t => t.symbol === symbol)
    .reduce((sum, t) => {
      return t.side === 'buy' ? sum + t.quantity : sum - t.quantity;
    }, 0);
}

// Calculate invested amount
export function calculateInvestedAmount(trades: Trade[], symbol: string): number {
  return trades
    .filter(t => t.symbol === symbol)
    .reduce((sum, t) => {
      const amount = t.quantity * t.price + t.fee;
      return t.side === 'buy' ? sum + amount : sum - amount;
    }, 0);
}

// Calculate holding period in days
export function calculateHoldingPeriodDays(trades: Trade[], symbol: string): number {
  const assetTrades = trades.filter(t => t.symbol === symbol);
  if (assetTrades.length === 0) return 0;
  
  const firstTrade = assetTrades.reduce((earliest, t) => 
    t.date < earliest.date ? t : earliest
  );
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - firstTrade.date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Check if all required prices are available
export function hasAllPrices(trades: Trade[], prices: Map<string, LivePrice>): boolean {
  const symbols = [...new Set(trades.map(t => t.symbol))];
  return symbols.every(symbol => prices.has(symbol));
}

// Calculate global portfolio total from ALL positions
export function calculateGlobalPortfolioTotal(
  trades: Trade[],
  prices: Map<string, LivePrice>
): number | null {
  const symbols = [...new Set(trades.map(t => t.symbol))];
  
  let total = 0;
  for (const symbol of symbols) {
    const quantity = calculateTotalQuantity(trades, symbol);
    if (quantity <= 0) continue; // Skip closed positions
    
    const priceData = prices.get(symbol);
    if (!priceData) return null; // Missing price - cannot calculate
    
    total += quantity * priceData.price;
  }
  
  return total;
}

// Calculate holdings from trades and live prices
export function calculateHoldings(
  trades: Trade[],
  prices: Map<string, LivePrice>,
  assetType: AssetType,
  globalPortfolioTotal?: number | null
): Holding[] {
  const filteredTrades = trades.filter(t => t.assetType === assetType);
  const symbols = [...new Set(filteredTrades.map(t => t.symbol))];
  
  const holdings: Holding[] = [];
  
  for (const symbol of symbols) {
    const quantity = calculateTotalQuantity(filteredTrades, symbol);
    if (quantity <= 0) continue; // Skip closed positions (qty = 0)
    
    const avgPrice = calculateAverageBuyPrice(filteredTrades, symbol);
    const investedAmount = calculateInvestedAmount(filteredTrades, symbol);
    const priceData = prices.get(symbol);
    const currentPrice = priceData?.price || avgPrice;
    const currentValue = quantity * currentPrice;
    const unrealizedPL = currentValue - investedAmount;
    const unrealizedPLPercent = investedAmount > 0 ? (unrealizedPL / investedAmount) * 100 : 0;
    
    // Allocation: use global total if provided and valid, otherwise null (show "--")
    let allocationPercent: number | null = null;
    if (globalPortfolioTotal && globalPortfolioTotal > 0 && priceData) {
      allocationPercent = (currentValue / globalPortfolioTotal) * 100;
    }
    
    holdings.push({
      symbol,
      name: getAssetName(symbol),
      assetType,
      isin: assetType === 'stock' ? getStockISIN(symbol) : undefined,
      logoUrl: getAssetLogo(symbol),
      quantity,
      averageBuyPrice: avgPrice,
      investedAmount,
      currentPrice,
      currentValue,
      unrealizedPL,
      unrealizedPLPercent,
      holdingPeriodDays: calculateHoldingPeriodDays(filteredTrades, symbol),
      allocationPercent: allocationPercent ?? -1, // -1 indicates incomplete/missing
      cumulativeCashflowPerShare: avgPrice,
      valuePerShare: currentPrice,
    });
  }
  
  return holdings;
}

// Calculate portfolio totals
export function calculatePortfolioTotals(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const totalPL = totalValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  
  return { totalValue, totalInvested, totalPL, totalPLPercent };
}

// Helper functions for asset metadata
function getAssetName(symbol: string): string {
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corp.',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corp.',
    'META': 'Meta Platforms',
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'LINK': 'Chainlink',
    'AVAX': 'Avalanche',
  };
  return names[symbol] || symbol;
}

function getStockISIN(symbol: string): string {
  const isins: Record<string, string> = {
    'AAPL': 'US0378331005',
    'MSFT': 'US5949181045',
    'GOOGL': 'US02079K3059',
    'AMZN': 'US0231351067',
    'TSLA': 'US88160R1014',
    'NVDA': 'US67066G1040',
    'META': 'US30303M1027',
  };
  return isins[symbol] || '';
}

function getAssetLogo(symbol: string): string {
  // In production, use actual logo URLs
  return `https://logo.clearbit.com/${symbol.toLowerCase()}.com`;
}

// Format currency
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentage
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Format quantity
export function formatQuantity(value: number): string {
  if (value === Math.floor(value)) {
    return value.toString();
  }
  return value.toFixed(6).replace(/\.?0+$/, '');
}
