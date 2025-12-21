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

// Binance public API (CORS enabled)
const BINANCE_API = 'https://api.binance.com/api/v3';

// Gate.io public API (CORS enabled)
const GATEIO_API = 'https://api.gateio.ws/api/v4';

// Symbol mapping for crypto (exchange-specific formats)
const cryptoSymbolMap: Record<string, { binance?: string; gateio?: string }> = {
  'BTC': { binance: 'BTCUSDT', gateio: 'BTC_USDT' },
  'ETH': { binance: 'ETHUSDT', gateio: 'ETH_USDT' },
  'SOL': { binance: 'SOLUSDT', gateio: 'SOL_USDT' },
  'XRP': { binance: 'XRPUSDT', gateio: 'XRP_USDT' },
  'ADA': { binance: 'ADAUSDT', gateio: 'ADA_USDT' },
  'DOGE': { binance: 'DOGEUSDT', gateio: 'DOGE_USDT' },
  'DOT': { binance: 'DOTUSDT', gateio: 'DOT_USDT' },
  'LINK': { binance: 'LINKUSDT', gateio: 'LINK_USDT' },
  'AVAX': { binance: 'AVAXUSDT', gateio: 'AVAX_USDT' },
  'MATIC': { binance: 'MATICUSDT', gateio: 'MATIC_USDT' },
};

// Fetch stock price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `${CORS_PROXY}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.warn(`Yahoo Finance error for ${symbol}: ${response.status}`);
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
    console.warn(`Failed to fetch Yahoo price for ${symbol}:`, error);
    return null;
  }
}

// Fetch crypto price from Binance
async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const binanceSymbol = cryptoSymbolMap[symbol.toUpperCase()]?.binance || `${symbol.toUpperCase()}USDT`;
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

// Fetch crypto price from Gate.io (fallback)
async function fetchGateioPrice(symbol: string): Promise<number | null> {
  try {
    const gateioSymbol = cryptoSymbolMap[symbol.toUpperCase()]?.gateio || `${symbol.toUpperCase()}_USDT`;
    const response = await fetch(`${GATEIO_API}/spot/tickers?currency_pair=${gateioSymbol}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data?.[0]?.last ? parseFloat(data[0].last) : null;
  } catch (error) {
    console.warn(`Failed to fetch Gate.io price for ${symbol}:`, error);
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
      // Try Binance first, then Gate.io
      price = await fetchBinancePrice(symbol);
      source = 'binance';
      
      if (price === null) {
        price = await fetchGateioPrice(symbol);
        source = 'gateio';
      }
    }

    // Fallback to cached price or mock if fetch failed
    if (price === null) {
      if (cached) {
        console.warn(`Using stale cache for ${symbol}`);
        return cached.price;
      }
      price = mockPrices[symbol] || mockPrices[symbol.toUpperCase()] || 0;
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
