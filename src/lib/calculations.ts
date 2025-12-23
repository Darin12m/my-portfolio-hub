import { Holding, Trade, LivePrice } from '@/types/portfolio';

/**
 * Calculate average buy price for a ticker
 */
export function calculateAverageBuyPrice(trades: Trade[], ticker: string): number {
  const buyTrades = trades.filter(t => t.ticker === ticker && t.action === 'BUY');
  if (buyTrades.length === 0) return 0;
  
  const totalCost = buyTrades.reduce((sum, t) => sum + (t.shares * t.pricePerShare), 0);
  const totalShares = buyTrades.reduce((sum, t) => sum + t.shares, 0);
  
  return totalShares > 0 ? totalCost / totalShares : 0;
}

/**
 * Calculate total shares for a ticker
 */
export function calculateTotalShares(trades: Trade[], ticker: string): number {
  return trades
    .filter(t => t.ticker === ticker)
    .reduce((sum, t) => {
      return t.action === 'BUY' ? sum + t.shares : sum - t.shares;
    }, 0);
}

/**
 * Calculate invested amount for a ticker
 */
export function calculateInvestedAmount(trades: Trade[], ticker: string): number {
  return trades
    .filter(t => t.ticker === ticker)
    .reduce((sum, t) => {
      const amount = t.shares * t.pricePerShare;
      return t.action === 'BUY' ? sum + amount : sum - amount;
    }, 0);
}

/**
 * Calculate holding period in days
 */
export function calculateHoldingPeriodDays(trades: Trade[], ticker: string): number {
  const tickerTrades = trades.filter(t => t.ticker === ticker);
  if (tickerTrades.length === 0) return 0;
  
  const firstTrade = tickerTrades.reduce((earliest, t) => 
    new Date(t.timestamp) < new Date(earliest.timestamp) ? t : earliest
  );
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - new Date(firstTrade.timestamp).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if all required prices are available
 */
export function hasAllPrices(trades: Trade[], prices: Map<string, LivePrice>): boolean {
  const tickers = [...new Set(trades.map(t => t.ticker))];
  return tickers.every(ticker => prices.has(ticker));
}

/**
 * Calculate global portfolio total from ALL positions
 */
export function calculateGlobalPortfolioTotal(
  trades: Trade[],
  prices: Map<string, LivePrice>
): number | null {
  const tickers = [...new Set(trades.map(t => t.ticker))];
  
  let total = 0;
  for (const ticker of tickers) {
    const shares = calculateTotalShares(trades, ticker);
    if (shares <= 0) continue;
    
    const priceData = prices.get(ticker);
    if (!priceData) return null;
    
    total += shares * priceData.price;
  }
  
  return total;
}

/**
 * Calculate holdings from trades and live prices
 */
export function calculateHoldings(
  trades: Trade[],
  prices: Map<string, LivePrice>,
  globalPortfolioTotal?: number | null
): Holding[] {
  const tickers = [...new Set(trades.map(t => t.ticker))];
  
  const holdings: Holding[] = [];
  
  for (const ticker of tickers) {
    const shares = calculateTotalShares(trades, ticker);
    if (shares <= 0) continue;
    
    const avgPrice = calculateAverageBuyPrice(trades, ticker);
    const investedAmount = calculateInvestedAmount(trades, ticker);
    const priceData = prices.get(ticker);
    const currentPrice = priceData?.price || avgPrice;
    const currentValue = shares * currentPrice;
    const unrealizedPL = currentValue - investedAmount;
    const unrealizedPLPercent = investedAmount > 0 ? (unrealizedPL / investedAmount) * 100 : 0;
    
    // Get name and ISIN from the most recent trade
    const tickerTrades = trades.filter(t => t.ticker === ticker);
    const latestTrade = tickerTrades[0];
    
    // Calculate allocation - never negative
    let allocationPercent = 0;
    if (globalPortfolioTotal && globalPortfolioTotal > 0 && priceData && currentValue > 0) {
      allocationPercent = Math.max(0, (currentValue / globalPortfolioTotal) * 100);
    }
    
    holdings.push({
      ticker,
      name: latestTrade?.name || ticker,
      isin: latestTrade?.isin,
      logoUrl: getAssetLogo(ticker),
      shares,
      averageBuyPrice: avgPrice,
      investedAmount,
      currentPrice,
      currentValue,
      unrealizedPL,
      unrealizedPLPercent,
      holdingPeriodDays: calculateHoldingPeriodDays(trades, ticker),
      allocationPercent,
    });
  }
  
  return holdings;
}

/**
 * Calculate portfolio totals
 */
export function calculatePortfolioTotals(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const totalPL = totalValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  
  return { totalValue, totalInvested, totalPL, totalPLPercent };
}

/**
 * Get asset logo URL
 */
function getAssetLogo(ticker: string): string {
  return `https://logo.clearbit.com/${ticker.toLowerCase()}.com`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format quantity with appropriate precision
 */
export function formatQuantity(value: number): string {
  if (value === Math.floor(value)) {
    return value.toString();
  }
  if (value < 1) {
    return value.toFixed(8).replace(/\.?0+$/, '');
  }
  return value.toFixed(6).replace(/\.?0+$/, '');
}
