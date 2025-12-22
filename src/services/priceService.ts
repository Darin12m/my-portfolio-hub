/**
 * Stock Price Service
 * Fetches live stock prices from Yahoo Finance
 * STOCKS ONLY - no crypto
 */

import type { LivePrice } from '@/types/portfolio';

// Configuration
const CACHE_TTL = 30000; // 30 seconds
const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Price cache
interface CacheEntry {
  price: LivePrice;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();

function isCacheFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Company name to ticker mapping
const companyToTickerMap: Record<string, string> = {
  'APPLE': 'AAPL',
  'MICROSOFT': 'MSFT',
  'AMAZON': 'AMZN',
  'ALPHABET': 'GOOGL',
  'META PLATFORMS': 'META',
  'TESLA': 'TSLA',
  'NVIDIA': 'NVDA',
  'BROADCOM': 'AVGO',
  'PALANTIR': 'PLTR',
  'SNOWFLAKE': 'SNOW',
  'NETFLIX': 'NFLX',
  'AMD': 'AMD',
  'INTEL': 'INTC',
  'DISNEY': 'DIS',
  'VISA': 'V',
  'MASTERCARD': 'MA',
  'JPMORGAN': 'JPM',
  'SALESFORCE': 'CRM',
  'ADOBE': 'ADBE',
  'PAYPAL': 'PYPL',
  'SPOTIFY': 'SPOT',
  'UBER': 'UBER',
  'AIRBNB': 'ABNB',
  'SHOPIFY': 'SHOP',
  'ZOOM': 'ZM',
  'CROWDSTRIKE': 'CRWD',
  'DATADOG': 'DDOG',
  'CLOUDFLARE': 'NET',
  'MONGODB': 'MDB',
};

/**
 * Resolve a symbol to Yahoo Finance ticker
 */
export function resolveStockTicker(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  
  // If it looks like a ticker, use it
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(upper)) {
    return upper;
  }
  
  return companyToTickerMap[upper] || upper;
}

/**
 * Fetch stock price from Yahoo Finance v8 chart endpoint
 */
async function fetchYahooChartPrice(ticker: string): Promise<{
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
} | null> {
  const resolvedTicker = resolveStockTicker(ticker);
  
  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_CHART_URL}/${resolvedTicker}?interval=1d&range=1d`)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.warn(`Yahoo chart error for ${resolvedTicker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    
    if (!meta?.regularMarketPrice) {
      console.warn(`No price data for ${resolvedTicker}`);
      return null;
    }
    
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    
    return {
      price,
      previousClose,
      change: previousClose ? price - previousClose : undefined,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : undefined,
    };
  } catch (error) {
    console.warn(`Chart endpoint failed for ${resolvedTicker}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple stocks
 */
export async function fetchStockPrices(tickers: string[]): Promise<Map<string, LivePrice>> {
  const results = new Map<string, LivePrice>();
  const now = Date.now();
  
  const toFetch: string[] = [];
  
  // Check cache first
  for (const ticker of tickers) {
    const cached = priceCache.get(ticker);
    if (cached && isCacheFresh(cached)) {
      results.set(ticker, cached.price);
    } else {
      toFetch.push(ticker);
    }
  }
  
  // Fetch missing prices in parallel
  if (toFetch.length > 0) {
    const promises = toFetch.map(async (ticker) => {
      const result = await fetchYahooChartPrice(ticker);
      
      if (result && result.price > 0) {
        const livePrice: LivePrice = {
          ticker,
          price: result.price,
          previousClose: result.previousClose,
          change: result.change,
          changePercent: result.changePercent,
          timestamp: now,
          source: 'yahoo',
        };
        
        results.set(ticker, livePrice);
        priceCache.set(ticker, { price: livePrice, timestamp: now });
      } else {
        // Use stale cache if available
        const stale = priceCache.get(ticker);
        if (stale) {
          results.set(ticker, stale.price);
        }
      }
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

/**
 * Fetch single stock price
 */
export async function fetchStockPrice(ticker: string): Promise<LivePrice | null> {
  const prices = await fetchStockPrices([ticker]);
  return prices.get(ticker) || null;
}

/**
 * Start auto-refresh for stock prices
 */
export function startPriceRefresh(
  tickers: string[],
  _assetType: string, // kept for backwards compatibility
  onUpdate: (prices: Map<string, LivePrice>) => void,
  interval: number = 30000
): () => void {
  // Initial fetch
  fetchStockPrices(tickers).then(onUpdate);
  
  // Set up interval
  const intervalId = setInterval(() => {
    fetchStockPrices(tickers).then(onUpdate);
  }, interval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
