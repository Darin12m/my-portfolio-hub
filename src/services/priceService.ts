/**
 * Unified Price Service
 * 
 * Fetches live market data from public APIs (no auth required):
 * - Stocks: Yahoo Finance v7/v8 endpoints via CORS proxy
 * - Crypto: CoinGecko (primary) with Binance fallback
 * 
 * Features:
 * - In-memory caching (30-60 seconds)
 * - Batch fetching
 * - Fallback to cached prices on failure
 * - NEVER returns 0 or undefined prices
 */

import { LivePrice, AssetType } from '@/types/portfolio';

// ==================== CONFIGURATION ====================

const CACHE_TTL = 30000; // 30 seconds
const CORS_PROXY = 'https://corsproxy.io/?';

// Yahoo Finance endpoints
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// CoinGecko public API
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Binance public API (fallback)
const BINANCE_API = 'https://api.binance.com/api/v3';

// ==================== PRICE CACHE ====================

interface CacheEntry {
  price: LivePrice;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();

function getCacheKey(symbol: string, assetType: AssetType): string {
  return `${assetType}:${symbol.toUpperCase()}`;
}

function isCacheFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// ==================== SYMBOL MAPPINGS ====================

// Map company names to Yahoo Finance tickers
const companyToTickerMap: Record<string, string> = {
  'APPLE': 'AAPL',
  'MICROSOFT': 'MSFT',
  'AMAZON': 'AMZN',
  'ALPHABET (CLASS A)': 'GOOGL',
  'ALPHABET (CLASS C)': 'GOOG',
  'ALPHABET': 'GOOGL',
  'META PLATFORMS': 'META',
  'TESLA': 'TSLA',
  'NVIDIA': 'NVDA',
  'BROADCOM': 'AVGO',
  'PALANTIR': 'PLTR',
  'PALANTIR TECHNOLOGIES': 'PLTR',
  'SNOWFLAKE': 'SNOW',
  'SOFI TECHNOLOGIES': 'SOFI',
  'SOFI': 'SOFI',
  'ROBINHOOD MARKETS': 'HOOD',
  'ROBINHOOD': 'HOOD',
  'NETFLIX': 'NFLX',
  'AMD': 'AMD',
  'ADVANCED MICRO DEVICES': 'AMD',
  'INTEL': 'INTC',
  'DISNEY': 'DIS',
  'WALT DISNEY': 'DIS',
  'VISA': 'V',
  'MASTERCARD': 'MA',
  'JPMORGAN': 'JPM',
  'JPMORGAN CHASE': 'JPM',
  'BANK OF AMERICA': 'BAC',
  'GOLDMAN SACHS': 'GS',
  'BERKSHIRE HATHAWAY': 'BRK-B',
  'JOHNSON & JOHNSON': 'JNJ',
  'UNITEDHEALTH': 'UNH',
  'WALMART': 'WMT',
  'HOME DEPOT': 'HD',
  'COSTCO': 'COST',
  'SALESFORCE': 'CRM',
  'ADOBE': 'ADBE',
  'ORACLE': 'ORCL',
  'CISCO': 'CSCO',
  'PAYPAL': 'PYPL',
  'SPOTIFY': 'SPOT',
  'UBER': 'UBER',
  'AIRBNB': 'ABNB',
  'COINBASE': 'COIN',
  'SHOPIFY': 'SHOP',
  'SQUARE': 'SQ',
  'BLOCK': 'SQ',
  'ZOOM': 'ZM',
  'ZOOM VIDEO': 'ZM',
  'DOCUSIGN': 'DOCU',
  'CROWDSTRIKE': 'CRWD',
  'DATADOG': 'DDOG',
  'TWILIO': 'TWLO',
  'OKTA': 'OKTA',
  'ATLASSIAN': 'TEAM',
  'SERVICENOW': 'NOW',
  'WORKDAY': 'WDAY',
  'SPLUNK': 'SPLK',
  'PALO ALTO NETWORKS': 'PANW',
  'FORTINET': 'FTNT',
  'ZSCALER': 'ZS',
  'CLOUDFLARE': 'NET',
  'MONGODB': 'MDB',
  'ELASTIC': 'ESTC',
  'CONFLUENT': 'CFLT',
};

// Map crypto symbols to CoinGecko IDs
const cryptoToCoinGeckoMap: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'ATOM': 'cosmos',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'ALGO': 'algorand',
  'FTM': 'fantom',
  'NEAR': 'near',
  'APE': 'apecoin',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'CRO': 'crypto-com-chain',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'ETC': 'ethereum-classic',
  'XLM': 'stellar',
  'VET': 'vechain',
  'FIL': 'filecoin',
  'HBAR': 'hedera-hashgraph',
  'ICP': 'internet-computer',
  'AAVE': 'aave',
  'XMR': 'monero',
  'OP': 'optimism',
  'ARB': 'arbitrum',
  'INJ': 'injective-protocol',
  'SUI': 'sui',
  'APT': 'aptos',
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
};

// ==================== SYMBOL RESOLUTION ====================

/**
 * Resolve a symbol to its Yahoo Finance ticker
 */
export function resolveStockTicker(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  
  // If it looks like a ticker (1-5 letters, optionally with dash), use it
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(upper)) {
    return upper;
  }
  
  // Look up in company name map
  return companyToTickerMap[upper] || upper;
}

/**
 * Resolve a crypto symbol to CoinGecko ID
 */
function resolveCryptoId(symbol: string): string | null {
  const upper = symbol.toUpperCase().trim();
  return cryptoToCoinGeckoMap[upper] || null;
}

// ==================== STOCK PRICE FETCHING ====================

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  marketState?: string;
}

/**
 * Fetch stock prices from Yahoo Finance v7 quote endpoint (batched)
 */
async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuoteResult>> {
  const results = new Map<string, YahooQuoteResult>();
  
  if (symbols.length === 0) return results;
  
  const tickers = symbols.map(resolveStockTicker);
  const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_QUOTE_URL}?symbols=${tickers.join(',')}`)}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.warn(`Yahoo Finance quote error: ${response.status}`);
      return results;
    }
    
    const data = await response.json();
    const quotes = data?.quoteResponse?.result || [];
    
    for (const quote of quotes) {
      results.set(quote.symbol, {
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketPreviousClose: quote.regularMarketPreviousClose,
        marketState: quote.marketState,
      });
    }
  } catch (error) {
    console.warn('Yahoo Finance fetch error:', error);
  }
  
  return results;
}

/**
 * Fetch single stock price with chart endpoint fallback
 */
async function fetchSingleStockPrice(symbol: string): Promise<number | null> {
  const ticker = resolveStockTicker(symbol);
  
  // Try v8 chart endpoint
  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_CHART_URL}/${ticker}?interval=1d&range=1d`)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      
      if (meta?.regularMarketPrice) {
        return meta.regularMarketPrice;
      }
      if (meta?.previousClose) {
        return meta.previousClose;
      }
    }
  } catch (error) {
    console.warn(`Chart endpoint failed for ${ticker}:`, error);
  }
  
  return null;
}

// ==================== CRYPTO PRICE FETCHING ====================

/**
 * Fetch crypto prices from CoinGecko (batched)
 */
async function fetchCoinGeckoPrices(symbols: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  
  if (symbols.length === 0) return results;
  
  // Map symbols to CoinGecko IDs
  const symbolToId: Record<string, string> = {};
  const ids: string[] = [];
  
  for (const symbol of symbols) {
    const id = resolveCryptoId(symbol);
    if (id) {
      symbolToId[symbol.toUpperCase()] = id;
      ids.push(id);
    }
  }
  
  if (ids.length === 0) return results;
  
  try {
    const url = `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`CoinGecko error: ${response.status}`);
      return results;
    }
    
    const data = await response.json();
    
    // Map back to original symbols
    for (const [symbol, id] of Object.entries(symbolToId)) {
      const price = data?.[id]?.usd;
      if (typeof price === 'number') {
        results.set(symbol, price);
      }
    }
  } catch (error) {
    console.warn('CoinGecko fetch error:', error);
  }
  
  return results;
}

/**
 * Fetch single crypto price from Binance (fallback)
 */
async function fetchBinancePrice(symbol: string): Promise<number | null> {
  const upper = symbol.toUpperCase();
  const binanceSymbol = `${upper}USDT`;
  
  try {
    const response = await fetch(`${BINANCE_API}/ticker/price?symbol=${binanceSymbol}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.price ? parseFloat(data.price) : null;
  } catch (error) {
    console.warn(`Binance fetch error for ${symbol}:`, error);
    return null;
  }
}

// ==================== UNIFIED PRICE SERVICE ====================

export interface PriceRequest {
  symbol: string;
  assetType: AssetType;
}

export interface NormalizedPrice {
  symbol: string;
  assetType: AssetType;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  timestamp: number;
  source: string;
}

/**
 * Fetch prices for a batch of assets
 * Routes stocks to Yahoo Finance, crypto to CoinGecko/Binance
 */
export async function fetchPricesBatch(requests: PriceRequest[]): Promise<Map<string, LivePrice>> {
  const results = new Map<string, LivePrice>();
  const now = Date.now();
  
  // Separate by asset type
  const stockSymbols: string[] = [];
  const cryptoSymbols: string[] = [];
  const requestMap = new Map<string, PriceRequest>();
  
  for (const req of requests) {
    const key = getCacheKey(req.symbol, req.assetType);
    requestMap.set(key, req);
    
    // Check cache first
    const cached = priceCache.get(key);
    if (cached && isCacheFresh(cached)) {
      results.set(req.symbol, cached.price);
      continue;
    }
    
    // Queue for fetching
    if (req.assetType === 'stock') {
      stockSymbols.push(req.symbol);
    } else {
      cryptoSymbols.push(req.symbol);
    }
  }
  
  // Fetch stocks from Yahoo Finance
  if (stockSymbols.length > 0) {
    const yahooResults = await fetchYahooQuotes(stockSymbols);
    
    for (const symbol of stockSymbols) {
      const ticker = resolveStockTicker(symbol);
      const quote = yahooResults.get(ticker);
      
      let price: number | null = quote?.regularMarketPrice || null;
      
      // Fallback to chart endpoint if quote failed
      if (!price) {
        price = await fetchSingleStockPrice(symbol);
      }
      
      // Fallback to cache or skip
      const cacheKey = getCacheKey(symbol, 'stock');
      if (!price || price <= 0) {
        const stale = priceCache.get(cacheKey);
        if (stale) {
          console.warn(`Using stale cache for ${symbol}`);
          results.set(symbol, stale.price);
        }
        continue;
      }
      
      const livePrice: LivePrice = {
        symbol,
        assetType: 'stock',
        price,
        timestamp: now,
        source: 'yahoo',
      };
      
      results.set(symbol, livePrice);
      priceCache.set(cacheKey, { price: livePrice, timestamp: now });
    }
  }
  
  // Fetch crypto from CoinGecko
  if (cryptoSymbols.length > 0) {
    const geckoResults = await fetchCoinGeckoPrices(cryptoSymbols);
    
    for (const symbol of cryptoSymbols) {
      const upper = symbol.toUpperCase();
      let price = geckoResults.get(upper) || null;
      
      // Fallback to Binance
      if (!price) {
        price = await fetchBinancePrice(symbol);
      }
      
      // Fallback to cache or skip
      const cacheKey = getCacheKey(symbol, 'crypto');
      if (!price || price <= 0) {
        const stale = priceCache.get(cacheKey);
        if (stale) {
          console.warn(`Using stale cache for ${symbol}`);
          results.set(symbol, stale.price);
        }
        continue;
      }
      
      const livePrice: LivePrice = {
        symbol,
        assetType: 'crypto',
        price,
        timestamp: now,
        source: price === geckoResults.get(upper) ? 'coingecko' : 'binance',
      };
      
      results.set(symbol, livePrice);
      priceCache.set(cacheKey, { price: livePrice, timestamp: now });
    }
  }
  
  return results;
}

/**
 * Fetch a single price
 */
export async function fetchPrice(symbol: string, assetType: AssetType): Promise<LivePrice | null> {
  const results = await fetchPricesBatch([{ symbol, assetType }]);
  return results.get(symbol) || null;
}

/**
 * Fetch prices for multiple symbols of the same asset type
 */
export async function fetchPrices(symbols: string[], assetType: AssetType): Promise<Map<string, LivePrice>> {
  const requests = symbols.map(symbol => ({ symbol, assetType }));
  return fetchPricesBatch(requests);
}

// ==================== PRICE VALIDATION ====================

/**
 * Check if all required prices are available and valid (> 0)
 */
export function hasAllValidPrices(symbols: string[], prices: Map<string, LivePrice>): boolean {
  return symbols.every(symbol => {
    const price = prices.get(symbol);
    return price && price.price > 0;
  });
}

/**
 * Get cached price if fresh
 */
export function getCachedPrice(symbol: string, assetType: AssetType): LivePrice | null {
  const key = getCacheKey(symbol, assetType);
  const cached = priceCache.get(key);
  if (cached && isCacheFresh(cached)) {
    return cached.price;
  }
  return null;
}

/**
 * Clear all cached prices
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

// ==================== AUTO-REFRESH ====================

/**
 * Start auto-refreshing prices at specified interval
 * Returns cleanup function
 */
export function startPriceRefresh(
  symbols: string[],
  assetType: AssetType,
  onUpdate: (prices: Map<string, LivePrice>) => void,
  interval = 30000
): () => void {
  let isActive = true;
  
  const refresh = async () => {
    if (!isActive || symbols.length === 0) return;
    
    try {
      const prices = await fetchPrices(symbols, assetType);
      if (isActive && prices.size > 0) {
        onUpdate(prices);
      }
    } catch (error) {
      console.error('Price refresh error:', error);
    }
  };
  
  // Initial fetch
  refresh();
  
  // Set up interval
  const intervalId = setInterval(refresh, interval);
  
  // Return cleanup function
  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
}

// ==================== CHART DATA ====================

export interface ChartDataPoint {
  time: number;
  value: number;
  label: string;
}

export type ChartRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'All';

/**
 * Fetch historical chart data from Yahoo Finance
 */
export async function fetchChartData(
  symbol: string,
  range: ChartRange = '1Y'
): Promise<ChartDataPoint[]> {
  const ticker = resolveStockTicker(symbol);
  
  // Map range to Yahoo Finance parameters
  const rangeMap: Record<ChartRange, { interval: string; range: string }> = {
    '1D': { interval: '5m', range: '1d' },
    '5D': { interval: '15m', range: '5d' },
    '1M': { interval: '1d', range: '1mo' },
    '6M': { interval: '1d', range: '6mo' },
    'YTD': { interval: '1d', range: 'ytd' },
    '1Y': { interval: '1d', range: '1y' },
    '5Y': { interval: '1wk', range: '5y' },
    'All': { interval: '1mo', range: 'max' },
  };
  
  const params = rangeMap[range];
  const url = `${CORS_PROXY}${encodeURIComponent(
    `${YAHOO_CHART_URL}/${ticker}?interval=${params.interval}&range=${params.range}`
  )}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.warn(`Chart data fetch error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) return [];
    
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    
    const chartData: ChartDataPoint[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const value = closes[i];
      if (typeof value !== 'number' || isNaN(value)) continue;
      
      const time = timestamps[i] * 1000; // Convert to milliseconds
      chartData.push({
        time,
        value,
        label: formatChartLabel(time, range),
      });
    }
    
    return chartData;
  } catch (error) {
    console.warn('Chart data fetch error:', error);
    return [];
  }
}

function formatChartLabel(timestamp: number, range: ChartRange): string {
  const date = new Date(timestamp);
  
  switch (range) {
    case '1D':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '5D':
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    case '1M':
    case '6M':
    case 'YTD':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '1Y':
    case '5Y':
    case 'All':
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleDateString();
  }
}
