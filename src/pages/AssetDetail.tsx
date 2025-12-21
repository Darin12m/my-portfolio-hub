import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { mockTrades, mockPrices } from '@/data/mockData';
import { calculateHoldings, formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { LivePrice } from '@/types/portfolio';

type TimeRange = '1D' | '5D' | '1M' | '6M' | '1Y' | 'ALL';

// Generate mock chart data for different time ranges
function generateChartData(currentPrice: number, range: TimeRange) {
  const data = [];
  let points = 24;
  let baseVariation = 0.05;
  
  switch (range) {
    case '1D': points = 24; baseVariation = 0.03; break;
    case '5D': points = 5 * 24; baseVariation = 0.08; break;
    case '1M': points = 30; baseVariation = 0.15; break;
    case '6M': points = 26; baseVariation = 0.25; break;
    case '1Y': points = 52; baseVariation = 0.35; break;
    case 'ALL': points = 100; baseVariation = 0.5; break;
  }

  const startPrice = currentPrice * (1 - baseVariation * Math.random());
  
  for (let i = points; i >= 0; i--) {
    const progress = (points - i) / points;
    const noise = (Math.random() - 0.5) * baseVariation * 0.3;
    const price = startPrice + (currentPrice - startPrice) * progress + currentPrice * noise;
    
    data.push({
      index: points - i,
      price: Math.max(0, price),
    });
  }
  
  data[data.length - 1].price = currentPrice;
  return data;
}

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  // Get current price
  const currentPrice = symbol ? mockPrices[symbol] || 0 : 0;
  
  // Build prices map
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

  // Calculate holding for this symbol
  const holding = useMemo(() => {
    if (!symbol) return null;
    const assetType = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX'].includes(symbol) ? 'crypto' : 'stock';
    const holdings = calculateHoldings(mockTrades, prices, assetType);
    return holdings.find(h => h.symbol === symbol) || null;
  }, [symbol, prices]);

  // Chart data
  const chartData = useMemo(() => {
    return generateChartData(currentPrice, timeRange);
  }, [currentPrice, timeRange]);

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const padding = (maxPrice - minPrice) * 0.1 || currentPrice * 0.05;

  // Daily change (mock)
  const dailyChange = currentPrice * 0.015;
  const dailyChangePercent = 1.5;
  const isPositive = dailyChange >= 0;

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Asset not found</p>
      </div>
    );
  }

  const timeRanges: TimeRange[] = ['1D', '5D', '1M', '6M', '1Y', 'ALL'];

  // Mock stats
  const stats = holding.assetType === 'stock' ? {
    marketCap: '$3.0T',
    volume: '52.3M',
    dayRange: `$${(currentPrice * 0.98).toFixed(2)} - $${(currentPrice * 1.02).toFixed(2)}`,
    yearRange: `$${(currentPrice * 0.7).toFixed(2)} - $${(currentPrice * 1.15).toFixed(2)}`,
    avgVolume: '48.2M',
  } : {
    marketCap: '$1.3T',
    volume: '$28.5B',
    dayRange: `$${(currentPrice * 0.98).toFixed(2)} - $${(currentPrice * 1.02).toFixed(2)}`,
    yearRange: `$${(currentPrice * 0.5).toFixed(2)} - $${(currentPrice * 1.5).toFixed(2)}`,
    circulatingSupply: '19.8M',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="touch-target"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
                <img
                  src={holding.logoUrl}
                  alt={symbol}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{holding.name}</h1>
                <p className="text-xs text-muted-foreground">{symbol}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 safe-area-bottom">
        {/* Price Header */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">{formatCurrency(currentPrice)}</h2>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-profit" />
            ) : (
              <TrendingDown className="h-4 w-4 text-loss" />
            )}
            <span className={cn("text-sm font-medium", isPositive ? "text-profit" : "text-loss")}>
              {isPositive ? '+' : ''}{formatCurrency(dailyChange)} ({formatPercent(dailyChangePercent)})
            </span>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" hide />
                <YAxis domain={[minPrice - padding, maxPrice + padding]} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#assetGradient)"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Time Range Selector */}
          <div className="flex justify-between gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium rounded-lg transition-all touch-target',
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="font-medium">{stats.marketCap}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="font-medium">{stats.volume}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Day Range</p>
              <p className="font-medium text-sm">{stats.dayRange}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">52W Range</p>
              <p className="font-medium text-sm">{stats.yearRange}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {holding.assetType === 'stock' ? 'Avg Volume' : 'Circulating Supply'}
              </p>
              <p className="font-medium">
                {holding.assetType === 'stock' ? stats.avgVolume : (stats as any).circulatingSupply}
              </p>
            </div>
          </div>
        </div>

        {/* Your Position */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Position</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className="font-medium">{formatQuantity(holding.quantity)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Cost</p>
              <p className="font-medium">{formatCurrency(holding.averageBuyPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="font-medium">{formatCurrency(holding.currentValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unrealized P/L</p>
              <p className={cn("font-medium", holding.unrealizedPL >= 0 ? "text-profit" : "text-loss")}>
                {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allocation</p>
              <p className="font-medium">{holding.allocationPercent.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Holding Period</p>
              <p className="font-medium">{holding.holdingPeriodDays} days</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
