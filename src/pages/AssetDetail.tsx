import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { mockTrades, mockPrices } from '@/data/mockData';
import { calculateHoldings, formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { LivePrice } from '@/types/portfolio';

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'All';

const TIME_RANGES: TimeRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'All'];

// Generate mock chart data for different time ranges
function generateChartData(currentPrice: number, range: TimeRange) {
  const data = [];
  const now = Date.now();
  
  let points: number;
  let interval: number;
  let variation: number;
  
  switch (range) {
    case '1D': points = 78; interval = 5 * 60 * 1000; variation = 0.02; break;
    case '5D': points = 40; interval = 3 * 60 * 60 * 1000; variation = 0.04; break;
    case '1M': points = 22; interval = 24 * 60 * 60 * 1000; variation = 0.08; break;
    case '6M': points = 26; interval = 7 * 24 * 60 * 60 * 1000; variation = 0.15; break;
    case 'YTD': points = 40; interval = 7 * 24 * 60 * 60 * 1000; variation = 0.18; break;
    case '1Y': points = 52; interval = 7 * 24 * 60 * 60 * 1000; variation = 0.25; break;
    case '5Y': points = 60; interval = 30 * 24 * 60 * 60 * 1000; variation = 0.5; break;
    case 'All': points = 80; interval = 45 * 24 * 60 * 60 * 1000; variation = 0.6; break;
  }

  const startMultiplier = 1 - variation + Math.random() * variation;
  let value = currentPrice * startMultiplier;
  
  for (let i = points; i >= 0; i--) {
    const time = now - i * interval;
    const change = (Math.random() - 0.48) * variation * 0.08 * currentPrice;
    value = Math.max(value + change, currentPrice * 0.3);
    
    data.push({
      time,
      value,
      label: formatTimeLabel(time, range),
    });
  }
  
  data[data.length - 1].value = currentPrice;
  return data;
}

function formatTimeLabel(timestamp: number, range: TimeRange): string {
  const date = new Date(timestamp);
  
  switch (range) {
    case '1D':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '5D':
      return date.toLocaleDateString([], { weekday: 'short' });
    case '1M':
    case '6M':
    case 'YTD':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '1Y':
    case '5Y':
    case 'All':
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Mock news data
const mockNews = [
  {
    id: 1,
    headline: "Q4 earnings beat expectations with strong revenue growth",
    source: "Reuters",
    time: "2 hours ago"
  },
  {
    id: 2,
    headline: "Analyst upgrades rating to Buy with new price target",
    source: "Bloomberg",
    time: "5 hours ago"
  },
  {
    id: 3,
    headline: "Company announces strategic partnership in emerging markets",
    source: "Financial Times",
    time: "1 day ago"
  },
];

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  const currentPrice = symbol ? mockPrices[symbol] || 0 : 0;
  
  const prices = useMemo(() => {
    const priceMap = new Map<string, LivePrice>();
    Object.entries(mockPrices).forEach(([sym, price]) => {
      priceMap.set(sym, {
        symbol: sym,
        assetType: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX'].includes(sym) ? 'crypto' : 'stock',
        price,
        timestamp: Date.now(),
        source: 'mock',
      });
    });
    return priceMap;
  }, []);

  const holding = useMemo(() => {
    if (!symbol) return null;
    const assetType = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX'].includes(symbol) ? 'crypto' : 'stock';
    const holdings = calculateHoldings(mockTrades, prices, assetType);
    return holdings.find(h => h.symbol === symbol) || null;
  }, [symbol, prices]);

  const chartData = useMemo(() => {
    return generateChartData(currentPrice, timeRange);
  }, [currentPrice, timeRange]);

  const baseline = chartData[0]?.value || currentPrice;
  const priceChange = currentPrice - baseline;
  const priceChangePercent = baseline > 0 ? (priceChange / baseline) * 100 : 0;
  const isPositive = priceChange >= 0;

  const minValue = Math.min(...chartData.map(d => d.value), baseline);
  const maxValue = Math.max(...chartData.map(d => d.value), baseline);
  const padding = (maxValue - minValue) * 0.12;

  // Mock stats
  const stats = holding?.assetType === 'stock' ? {
    prevClose: formatCurrency(currentPrice * 0.995),
    dayRange: `${formatCurrency(currentPrice * 0.98)} - ${formatCurrency(currentPrice * 1.02)}`,
    yearRange: `${formatCurrency(currentPrice * 0.65)} - ${formatCurrency(currentPrice * 1.2)}`,
    marketCap: '$3.0T',
    volume: '52.3M',
    avgVolume: '48.2M',
    peRatio: '28.5',
    eps: formatCurrency(currentPrice / 28.5),
    earningsDate: 'Jan 25, 2025',
  } : {
    prevClose: formatCurrency(currentPrice * 0.995),
    dayRange: `${formatCurrency(currentPrice * 0.97)} - ${formatCurrency(currentPrice * 1.03)}`,
    yearRange: `${formatCurrency(currentPrice * 0.4)} - ${formatCurrency(currentPrice * 1.8)}`,
    marketCap: '$1.3T',
    volume: '$28.5B',
    avgVolume: '$25.1B',
    circulatingSupply: '19.8M',
    totalSupply: '21M',
  };

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Asset not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="touch-target h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                <img
                  src={holding.logoUrl}
                  alt={symbol}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">{holding.name}</h1>
                <p className="text-xs text-muted-foreground">{symbol} • {holding.assetType === 'stock' ? 'NASDAQ' : 'Crypto'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 safe-area-bottom">
        {/* Price Header */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold">{formatCurrency(currentPrice)}</h2>
            <span className="text-xs text-muted-foreground">USD</span>
          </div>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={cn("text-sm font-semibold", isPositive ? "text-success" : "text-destructive")}>
              {isPositive ? '+' : ''}{formatCurrency(Math.abs(priceChange))} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>

        {/* Trading Chart */}
        <div className="trading-chart-container">
          {/* Time Range Tabs */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto scroll-smooth-x pb-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all touch-target min-w-[40px]",
                  timeRange === range
                    ? "bg-chart-active text-chart-active-foreground"
                    : "text-chart-muted hover:text-chart-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 8, right: 50, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="assetProfitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-profit))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--chart-profit))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="assetLossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-loss))" stopOpacity={0} />
                    <stop offset="100%" stopColor="hsl(var(--chart-loss))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--chart-muted))', fontSize: 9 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[minValue - padding, maxValue + padding]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--chart-muted))', fontSize: 9 }}
                  tickFormatter={(val) => formatCurrency(val).replace('$', '')}
                  orientation="right"
                  width={45}
                />
                
                <ReferenceLine 
                  y={baseline} 
                  stroke="hsl(var(--chart-baseline))"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                
                <ReferenceLine 
                  y={currentPrice} 
                  stroke={isPositive ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}
                  strokeDasharray="2 2"
                  strokeWidth={1.5}
                />
                
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-chart-popover border border-chart-border rounded-lg px-3 py-2 shadow-xl">
                          <p className="text-sm font-semibold text-chart-foreground">
                            {formatCurrency(data.value)}
                          </p>
                          <p className="text-xs text-chart-muted">{data.label}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: 'hsl(var(--chart-cursor))', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}
                  strokeWidth={2}
                  fill={isPositive ? 'url(#assetProfitGradient)' : 'url(#assetLossGradient)'}
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Current Price Badge */}
            <div 
              className={cn(
                "absolute right-0 px-2 py-0.5 rounded text-[10px] font-semibold",
                isPositive ? "bg-chart-profit text-white" : "bg-chart-loss text-white"
              )}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              {formatCurrency(currentPrice)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Close</span>
              <span className="font-medium">{stats.prevClose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day's Range</span>
              <span className="font-medium text-xs">{stats.dayRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">52-Week Range</span>
              <span className="font-medium text-xs">{stats.yearRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-medium">{stats.marketCap}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-medium">{stats.volume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg. Volume</span>
              <span className="font-medium">{stats.avgVolume}</span>
            </div>
            {holding.assetType === 'stock' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="font-medium">{(stats as any).peRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS</span>
                  <span className="font-medium">{(stats as any).eps}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Earnings Date</span>
                  <span className="font-medium">{(stats as any).earningsDate}</span>
                </div>
              </>
            )}
            {holding.assetType === 'crypto' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Circulating Supply</span>
                  <span className="font-medium">{(stats as any).circulatingSupply}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-medium">{(stats as any).totalSupply}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Your Position */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Position</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares</span>
              <span className="font-medium">{formatQuantity(holding.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Cost</span>
              <span className="font-medium">{formatCurrency(holding.averageBuyPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Value</span>
              <span className="font-medium">{formatCurrency(holding.currentValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Return</span>
              <span className={cn("font-medium", holding.unrealizedPL >= 0 ? "text-success" : "text-destructive")}>
                {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allocation</span>
              <span className="font-medium">{holding.allocationPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days Held</span>
              <span className="font-medium">{holding.holdingPeriodDays}</span>
            </div>
          </div>
        </div>

        {/* News Section */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent News</h3>
          <div className="space-y-3">
            {mockNews.map((news) => (
              <div key={news.id} className="group cursor-pointer">
                <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                  {news.headline}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{news.source}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{news.time}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
