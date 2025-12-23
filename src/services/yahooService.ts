// Yahoo Finance API service using Vercel proxy endpoints
// STOCKS ONLY - no crypto

const API_BASE = 'https://portfolio-hub-tau.vercel.app/api';

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

export async function fetchStockData(symbol: string, timeRange: TimeRange = '1Y'): Promise<StockData | null> {
  try {
    const { range, interval } = RANGE_CONFIG[timeRange];
    const url = `${API_BASE}/yahoo-price?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Yahoo price API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Handle API response structure
    const result = data?.chart?.result?.[0];
    if (!result) {
      console.error('Invalid Yahoo response structure');
      return null;
    }
    
    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    
    // Build quote data
    const quote: YahooQuote = {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || symbol,
      longName: meta.longName || meta.shortName || symbol,
      regularMarketPrice: meta.regularMarketPrice || closes[closes.length - 1] || 0,
      regularMarketChange: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || meta.previousClose || 0),
      regularMarketChangePercent: meta.chartPreviousClose 
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 
        : 0,
      regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose || 0,
      regularMarketOpen: meta.regularMarketOpen || quotes.open?.[0] || 0,
      regularMarketDayLow: meta.regularMarketDayLow || Math.min(...closes.filter(Boolean)) || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || Math.max(...closes.filter(Boolean)) || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      marketCap: meta.marketCap || 0,
      regularMarketVolume: meta.regularMarketVolume || 0,
      averageDailyVolume10Day: meta.averageDailyVolume10Day || 0,
      trailingPE: meta.trailingPE,
      epsTrailingTwelveMonths: meta.epsTrailingTwelveMonths,
      marketState: getMarketState(),
    };
    
    // Build chart data
    const chartData: ChartDataPoint[] = timestamps
      .map((time: number, i: number) => {
        const value = closes[i];
        if (value == null || isNaN(value)) return null;
        return {
          time,
          value,
          label: formatTimeLabel(time, timeRange),
        };
      })
      .filter(Boolean) as ChartDataPoint[];
    
    // Build stats
    const stats = {
      prevClose: `$${quote.regularMarketPreviousClose.toFixed(2)}`,
      open: `$${quote.regularMarketOpen.toFixed(2)}`,
      dayRange: `$${quote.regularMarketDayLow.toFixed(2)} - $${quote.regularMarketDayHigh.toFixed(2)}`,
      yearRange: `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`,
      marketCap: formatMarketCap(quote.marketCap),
      volume: formatVolume(quote.regularMarketVolume),
      avgVolume: formatVolume(quote.averageDailyVolume10Day),
      peRatio: quote.trailingPE ? quote.trailingPE.toFixed(2) : 'N/A',
      eps: quote.epsTrailingTwelveMonths ? `$${quote.epsTrailingTwelveMonths.toFixed(2)}` : 'N/A',
    };
    
    return { quote, chartData, stats };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return null;
  }
}

export async function fetchStockNews(symbol: string): Promise<YahooNews[]> {
  try {
    const url = `${API_BASE}/yahoo-news?symbol=${encodeURIComponent(symbol)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Yahoo news API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // The API returns an array of news items
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data.slice(0, 5).map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      publisher: item.publisher || 'Unknown',
      providerPublishTime: item.providerPublishTime || 0,
    }));
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
