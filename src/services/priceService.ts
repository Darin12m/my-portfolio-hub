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

// Unified price fetching interface
export async function fetchPrice(symbol: string, assetType: AssetType): Promise<LivePrice> {
  // Check cache first
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    let price: number;
    let source: string;

    if (assetType === 'stock') {
      // In production, use Yahoo Finance or similar
      // For demo, use mock prices with slight randomization
      const basePrice = mockPrices[symbol] || 100;
      price = basePrice * (1 + (Math.random() - 0.5) * 0.001);
      source = 'yahoo';
    } else {
      // In production, use Binance/Gate.io API
      // For demo, use mock prices with slight randomization
      const basePrice = mockPrices[symbol] || 1;
      price = basePrice * (1 + (Math.random() - 0.5) * 0.002);
      source = 'binance';
    }

    const livePrice: LivePrice = {
      symbol,
      assetType,
      price,
      timestamp: Date.now(),
      source,
    };

    // Update cache
    priceCache[symbol] = {
      price: livePrice,
      timestamp: Date.now(),
    };

    return livePrice;
  } catch (error) {
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

// Fetch prices for multiple symbols
export async function fetchPrices(symbols: string[], assetType: AssetType): Promise<Map<string, LivePrice>> {
  const prices = new Map<string, LivePrice>();
  
  const pricePromises = symbols.map(async (symbol) => {
    const price = await fetchPrice(symbol, assetType);
    prices.set(symbol, price);
  });

  await Promise.all(pricePromises);
  return prices;
}

// Get cached price or null
export function getCachedPrice(symbol: string): LivePrice | null {
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  return null;
}

// Clear price cache
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach(key => delete priceCache[key]);
}

// Auto-refresh prices
export function startPriceRefresh(
  symbols: string[],
  assetType: AssetType,
  onUpdate: (prices: Map<string, LivePrice>) => void,
  interval = 30000
): () => void {
  const refresh = async () => {
    const prices = await fetchPrices(symbols, assetType);
    onUpdate(prices);
  };

  // Initial fetch
  refresh();

  // Set up interval
  const intervalId = setInterval(refresh, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
