import { LivePrice, AssetType } from '@/types/portfolio';
import { mockPrices } from '@/data/mockData';

interface PriceCache {
  [symbol: string]: {
    price: LivePrice;
    timestamp: number;
  };
}

const priceCache: PriceCache = {};
const CACHE_DURATION = 30000; // 30 seconds

// CORS proxy for Yahoo Finance (stocks)
const CORS_PROXY = 'https://corsproxy.io/?';

// CoinGecko public API (CORS enabled, no auth required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Binance public API (CORS enabled) - fallback
const BINANCE_API = 'https://api.binance.com/api/v3';

// Map company names to Yahoo Finance ticker symbols
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
  'SNOWFLAKE INC': 'SNOW',
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
};

// Symbol mapping for Binance (fallback)
const cryptoToBinanceMap: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'XRP': 'XRPUSDT',
  'ADA': 'ADAUSDT',
  'DOGE': 'DOGEUSDT',
  'DOT': 'DOTUSDT',
  'LINK': 'LINKUSDT',
  'AVAX': 'AVAXUSDT',
  'MATIC': 'MATICUSDT',
};

/**
 * Resolve a symbol to its Yahoo Finance ticker
 * Handles both actual tickers (AAPL) and company names (APPLE)
 */
function resolveStockTicker(symbol: string): string {
  const upper = symbol.toUpperCase();
  
  // If it's already a known ticker (2-5 chars, no spaces), use it
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(upper)) {
    return upper;
  }
  
  // Look up in company name map
  return companyToTickerMap[upper] || upper;
}

// Fetch stock price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<number | null> {
  const ticker = resolveStockTicker(symbol);
  
  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.warn(`Yahoo Finance error for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const quote = data?.chart?.result?.[0]?.meta;
    
    if (quote?.regularMarketPrice) {
      return quote.regularMarketPrice;
    }
    
    // Fallback to previous close if market is closed
    if (quote?.previousClose) {
      return quote.previousClose;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch Yahoo price for ${ticker}:`, error);
    return null;
  }
}

// Fetch crypto price from CoinGecko (primary source)
async function fetchCoinGeckoPrice(symbol: string): Promise<number | null> {
  const coinId = cryptoToCoinGeckoMap[symbol.toUpperCase()];
  if (!coinId) {
    console.warn(`No CoinGecko mapping for ${symbol}`);
    return null;
  }
  
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      console.warn(`CoinGecko error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data?.[coinId]?.usd || null;
  } catch (error) {
    console.warn(`Failed to fetch CoinGecko price for ${symbol}:`, error);
    return null;
  }
}

// Fetch crypto price from Binance (fallback)
async function fetchBinancePrice(symbol: string): Promise<number | null> {
  const binanceSymbol = cryptoToBinanceMap[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`;
  
  try {
    const response = await fetch(`${BINANCE_API}/ticker/price?symbol=${binanceSymbol}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data?.price ? parseFloat(data.price) : null;
  } catch (error) {
    console.warn(`Failed to fetch Binance price for ${symbol}:`, error);
    return null;
  }
}

// Unified price fetching interface
export async function fetchPrice(symbol: string, assetType: AssetType): Promise<LivePrice> {
  const cacheKey = `${symbol}_${assetType}`;
  
  // Check cache first
  const cached = priceCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    let price: number | null = null;
    let source: string = 'unknown';

    if (assetType === 'stock') {
      price = await fetchYahooPrice(symbol);
      source = 'yahoo';
    } else {
      // Try CoinGecko first, then Binance as fallback
      price = await fetchCoinGeckoPrice(symbol);
      source = 'coingecko';
      
      if (price === null) {
        price = await fetchBinancePrice(symbol);
        source = 'binance';
      }
    }

    // Fallback to cached price or mock if fetch failed
    if (price === null) {
      if (cached) {
        console.warn(`Using stale cache for ${symbol}`);
        return cached.price;
      }
      // Try to find in mock prices with resolved ticker
      const resolvedSymbol = assetType === 'stock' ? resolveStockTicker(symbol) : symbol.toUpperCase();
      price = mockPrices[resolvedSymbol] || mockPrices[symbol] || mockPrices[symbol.toUpperCase()] || 0;
      source = 'fallback';
    }

    const livePrice: LivePrice = {
      symbol,
      assetType,
      price,
      timestamp: Date.now(),
      source,
    };

    // Update cache
    priceCache[cacheKey] = {
      price: livePrice,
      timestamp: Date.now(),
    };

    return livePrice;
  } catch (error) {
    console.error(`Price fetch error for ${symbol}:`, error);
    
    // Fallback to cached or mock price
    if (cached) {
      return cached.price;
    }
    
    return {
      symbol,
      assetType,
      price: mockPrices[symbol] || 0,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }
}

// Fetch prices for multiple symbols (batched)
export async function fetchPrices(symbols: string[], assetType: AssetType): Promise<Map<string, LivePrice>> {
  const prices = new Map<string, LivePrice>();
  
  if (symbols.length === 0) {
    return prices;
  }

  // Batch fetch with Promise.allSettled to handle individual failures
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const price = await fetchPrice(symbol, assetType);
      return { symbol, price };
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      prices.set(result.value.symbol, result.value.price);
    }
  });

  return prices;
}

// Check if all prices are available and valid
export function hasAllValidPrices(symbols: string[], prices: Map<string, LivePrice>): boolean {
  return symbols.every(symbol => {
    const price = prices.get(symbol);
    return price && price.price > 0;
  });
}

// Get cached price or null
export function getCachedPrice(symbol: string, assetType: AssetType): LivePrice | null {
  const cacheKey = `${symbol}_${assetType}`;
  const cached = priceCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  return null;
}

// Clear price cache
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach(key => delete priceCache[key]);
}

// Auto-refresh prices with cleanup
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
      if (isActive) {
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
