// Yahoo Finance API service
// STOCKS ONLY - no crypto

const VERCEL_API_BASE = 'https://portfolio-hub-tau.vercel.app/api';
const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v6/finance/quote';

export interface YahooQuote {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  regularMarketDayLow: number;
  regularMarketDayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  marketCap: number;
  regularMarketVolume: number;
  averageDailyVolume10Day: number;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
  earningsDate?: string;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
}

export interface ChartDataPoint {
  time: number;
  value: number;
  label: string;
}

export interface YahooNews {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number;
}

type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX';

const RANGE_CONFIG: Record<TimeRange, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  'YTD': { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  'MAX': { range: 'max', interval: '1mo' },
};

/**
 * Sanitizes a stock symbol by:
 * - Trimming whitespace
 * - Extracting the ticker from formats like "NVDA · STOCK" or "NVIDIA NVDA"
 * - Converting to uppercase
 * - Validating it looks like a valid ticker (1-5 uppercase letters)
 */
export function sanitizeSymbol(rawSymbol: string | undefined): string | null {
  if (!rawSymbol) return null;
  
  // Trim and uppercase
  let symbol = rawSymbol.trim().toUpperCase();
  
  // Handle "TICKER · STOCK" format
  if (symbol.includes('·')) {
    symbol = symbol.split('·')[0].trim();
  }
  
  // Handle "TICKER - DESCRIPTION" format
  if (symbol.includes('-')) {
    symbol = symbol.split('-')[0].trim();
  }
  
  // Handle "Company Name TICKER" - take the last word if it looks like a ticker
  const parts = symbol.split(/\s+/);
  if (parts.length > 1) {
    // Check if last part is a valid ticker (1-5 uppercase letters)
    const lastPart = parts[parts.length - 1];
    if (/^[A-Z]{1,5}$/.test(lastPart)) {
      symbol = lastPart;
    } else {
      // Try first part
      symbol = parts[0];
    }
  }
  
  // Validate: must be 1-5 uppercase letters (standard US stock tickers)
  if (!/^[A-Z]{1,5}$/.test(symbol)) {
    return null;
  }
  
  return symbol;
}

/**
 * Check if a symbol is valid
 */
export function isValidSymbol(symbol: string | undefined): boolean {
  return sanitizeSymbol(symbol) !== null;
}

function formatTimeLabel(timestamp: number, range: TimeRange): string {
  const date = new Date(timestamp * 1000);
  
  switch (range) {
    case '1D':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '5D':
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    case '1M':
    case '3M':
    case '6M':
    case 'YTD':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '1Y':
    case 'MAX':
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

export interface StockData {
  quote: YahooQuote;
  chartData: ChartDataPoint[];
  stats: {
    prevClose: string;
    open: string;
    dayRange: string;
    yearRange: string;
    marketCap: string;
    volume: string;
    avgVolume: string;
    peRatio: string;
    eps: string;
  };
}

/**
 * Fetch additional fundamentals from v6/quote endpoint
 */
async function fetchQuoteFundamentals(symbol: string): Promise<{
  marketCap?: number;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
  averageVolume?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
} | null> {
  try {
    const yahooUrl = `${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbol)}`;
    const corsUrl = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;
    
    const response = await fetch(corsUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data?.quoteResponse?.result?.[0];
    if (!result) return null;
    
    return {
      marketCap: result.marketCap,
      trailingPE: result.trailingPE,
      epsTrailingTwelveMonths: result.epsTrailingTwelveMonths,
      averageVolume: result.averageDailyVolume3Month || result.averageDailyVolume10Day,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
    };
  } catch (error) {
    console.warn('Quote fundamentals fetch failed, using chart data only:', error);
    return null;
  }
}

export async function fetchStockData(rawSymbol: string, timeRange: TimeRange = '1Y'): Promise<StockData | null> {
  // Sanitize the symbol first
  const symbol = sanitizeSymbol(rawSymbol);
  if (!symbol) {
    console.error('Invalid symbol:', rawSymbol);
    return null;
  }
  
  try {
    const { range, interval } = RANGE_CONFIG[timeRange];
    
    // Fetch chart data and quote fundamentals in parallel
    let chartData: any = null;
    let summaryData: Awaited<ReturnType<typeof fetchQuoteFundamentals>> = null;
    
    const [chartResult, fundamentalsResult] = await Promise.allSettled([
      (async () => {
        // Try Vercel API first, fallback to CORS proxy
        try {
          const vercelUrl = `${VERCEL_API_BASE}/yahoo-price?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
          const response = await fetch(vercelUrl, { signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            return await response.json();
          }
        } catch {
          // Vercel API failed
        }
        
        const yahooUrl = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
        const corsUrl = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;
        const response = await fetch(corsUrl);
        if (!response.ok) {
          throw new Error(`Yahoo price API error: ${response.status}`);
        }
        return await response.json();
      })(),
      fetchQuoteFundamentals(symbol)
    ]);
    
    if (chartResult.status === 'fulfilled') {
      chartData = chartResult.value;
    }
    if (fundamentalsResult.status === 'fulfilled') {
      summaryData = fundamentalsResult.value;
    }
    
    if (!chartData) {
      console.error('Failed to fetch chart data');
      return null;
    }
    
    // Handle API response structure - be lenient with partial data
    const result = chartData?.chart?.result?.[0];
    if (!result?.meta) {
      console.error('Invalid Yahoo response structure');
      return null;
    }
    
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    
    // Get price with fallbacks
    const regularMarketPrice = meta.regularMarketPrice ?? 
                               closes[closes.length - 1] ?? 
                               meta.chartPreviousClose ?? 
                               meta.previousClose ?? 0;
    
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? regularMarketPrice;
    
    // Merge fundamentals: prefer quote endpoint, fallback to chart meta
    const marketCap = summaryData?.marketCap || meta.marketCap || 0;
    const trailingPE = summaryData?.trailingPE || meta.trailingPE;
    const epsTrailingTwelveMonths = summaryData?.epsTrailingTwelveMonths || meta.epsTrailingTwelveMonths;
    const averageVolume = summaryData?.averageVolume || meta.averageDailyVolume10Day || 0;
    const fiftyTwoWeekLow = summaryData?.fiftyTwoWeekLow || meta.fiftyTwoWeekLow || 0;
    const fiftyTwoWeekHigh = summaryData?.fiftyTwoWeekHigh || meta.fiftyTwoWeekHigh || 0;
    
    // Build quote data with safe fallbacks
    const quote: YahooQuote = {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || symbol,
      longName: meta.longName || meta.shortName || symbol,
      regularMarketPrice,
      regularMarketChange: regularMarketPrice - previousClose,
      regularMarketChangePercent: previousClose > 0 
        ? ((regularMarketPrice - previousClose) / previousClose) * 100 
        : 0,
      regularMarketPreviousClose: previousClose,
      regularMarketOpen: meta.regularMarketOpen ?? quotes.open?.[0] ?? regularMarketPrice,
      regularMarketDayLow: meta.regularMarketDayLow ?? (closes.length > 0 ? Math.min(...closes.filter(Boolean)) : regularMarketPrice),
      regularMarketDayHigh: meta.regularMarketDayHigh ?? (closes.length > 0 ? Math.max(...closes.filter(Boolean)) : regularMarketPrice),
      fiftyTwoWeekLow,
      fiftyTwoWeekHigh,
      marketCap,
      regularMarketVolume: meta.regularMarketVolume ?? 0,
      averageDailyVolume10Day: averageVolume,
      trailingPE,
      epsTrailingTwelveMonths,
      marketState: getMarketState(),
    };
    
    // Build chart data - filter out invalid points
    const chartPoints: ChartDataPoint[] = timestamps
      .map((time: number, i: number) => {
        const value = closes[i];
        if (value == null || isNaN(value) || value <= 0) return null;
        return {
          time,
          value,
          label: formatTimeLabel(time, timeRange),
        };
      })
      .filter(Boolean) as ChartDataPoint[];
    
    // Build stats with safe formatting
    const formatPrice = (val: number) => val > 0 ? `$${val.toFixed(2)}` : 'N/A';
    
    const stats = {
      prevClose: formatPrice(quote.regularMarketPreviousClose),
      open: formatPrice(quote.regularMarketOpen),
      dayRange: quote.regularMarketDayLow > 0 && quote.regularMarketDayHigh > 0
        ? `$${quote.regularMarketDayLow.toFixed(2)} - $${quote.regularMarketDayHigh.toFixed(2)}`
        : 'N/A',
      yearRange: quote.fiftyTwoWeekLow > 0 && quote.fiftyTwoWeekHigh > 0
        ? `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`
        : 'N/A',
      marketCap: quote.marketCap > 0 ? formatMarketCap(quote.marketCap) : 'N/A',
      volume: quote.regularMarketVolume > 0 ? formatVolume(quote.regularMarketVolume) : 'N/A',
      avgVolume: quote.averageDailyVolume10Day > 0 ? formatVolume(quote.averageDailyVolume10Day) : 'N/A',
      peRatio: quote.trailingPE ? quote.trailingPE.toFixed(2) : 'N/A',
      eps: quote.epsTrailingTwelveMonths ? `$${quote.epsTrailingTwelveMonths.toFixed(2)}` : 'N/A',
    };
    
    return { quote, chartData: chartPoints, stats };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return null;
  }
}

export async function fetchStockNews(rawSymbol: string, companyName?: string): Promise<YahooNews[]> {
  // Sanitize the symbol first
  const symbol = sanitizeSymbol(rawSymbol);
  if (!symbol) {
    return [];
  }
  
  try {
    let rawNews: any[] = [];
    
    // Try Vercel API first, fallback to CORS proxy
    try {
      const vercelUrl = `${VERCEL_API_BASE}/yahoo-news?symbol=${encodeURIComponent(symbol)}`;
      const response = await fetch(vercelUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        rawNews = Array.isArray(data) ? data : [];
      }
    } catch {
      // Vercel API failed, try CORS proxy
    }
    
    if (rawNews.length === 0) {
      const yahooUrl = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(symbol)}&newsCount=10`;
      const corsUrl = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;
      const response = await fetch(corsUrl);
      if (!response.ok) {
        console.error('Yahoo news API error:', response.status);
        return [];
      }
      const data = await response.json();
      rawNews = data?.news || [];
    }
    
    if (!Array.isArray(rawNews)) {
      return [];
    }
    
    // Filter for stock-specific news
    const symbolUpper = symbol.toUpperCase();
    const companyNameLower = companyName?.toLowerCase() || '';
    
    // Parse and filter news
    const filteredNews = rawNews
      .map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        publisher: item.publisher || 'Unknown',
        providerPublishTime: item.providerPublishTime || 0,
        relatedTickers: item.relatedTickers || [],
      }))
      .filter((item) => {
        if (!item.title || !item.link) return false;
        
        // Priority 1: Check if relatedTickers includes our symbol
        if (Array.isArray(item.relatedTickers)) {
          const hasSymbol = item.relatedTickers.some(
            (t: string) => t?.toUpperCase() === symbolUpper
          );
          if (hasSymbol) return true;
        }
        
        // Priority 2: Check if title contains ticker or company name
        const titleLower = item.title.toLowerCase();
        const titleUpper = item.title.toUpperCase();
        
        if (titleUpper.includes(symbolUpper)) return true;
        if (companyNameLower && titleLower.includes(companyNameLower)) return true;
        
        // Exclude generic market news if no match
        return false;
      })
      .slice(0, 5)
      .map(({ relatedTickers, ...rest }) => rest as YahooNews);
    
    return filteredNews;
  } catch (error) {
    console.error('Error fetching stock news:', error);
    return [];
  }
}

function getMarketState(): 'PRE' | 'REGULAR' | 'POST' | 'CLOSED' {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const time = hour * 60 + minute;
  
  // Weekend
  if (day === 0 || day === 6) return 'CLOSED';
  
  // Pre-market: 4:00 AM - 9:30 AM
  if (time >= 240 && time < 570) return 'PRE';
  
  // Regular: 9:30 AM - 4:00 PM
  if (time >= 570 && time < 960) return 'REGULAR';
  
  // Post-market: 4:00 PM - 8:00 PM
  if (time >= 960 && time < 1200) return 'POST';
  
  return 'CLOSED';
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function getMarketStateLabel(state: string): { label: string; color: string } {
  switch (state) {
    case 'REGULAR':
      return { label: 'Market Open', color: 'text-success' };
    case 'PRE':
      return { label: 'Pre-Market', color: 'text-warning' };
    case 'POST':
      return { label: 'After Hours', color: 'text-warning' };
    default:
      return { label: 'Market Closed', color: 'text-muted-foreground' };
  }
}
