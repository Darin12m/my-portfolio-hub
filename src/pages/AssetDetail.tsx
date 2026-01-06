import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { calculateHoldings, formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import type { LivePrice, Trade } from '@/types/portfolio';
import { getTrades } from '@/services/firestoreService';
import { DecorativeBubbles } from '@/components/DecorativeBubbles';
import { GradientCard } from '@/components/GradientCard';
import { 
  fetchStockData, 
  fetchStockNews, 
  formatTimeAgo, 
  getMarketStateLabel,
  sanitizeSymbol,
  type StockData,
  type YahooNews
} from '@/services/yahooService';

type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX';

const TIME_RANGES: TimeRange[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', 'MAX'];

export default function AssetDetail() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [news, setNews] = useState<YahooNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sanitize the symbol from URL
  const symbol = useMemo(() => sanitizeSymbol(rawSymbol), [rawSymbol]);

  // Load trades from Firestore
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const firestoreTrades = await getTrades();
        setTrades(firestoreTrades);
      } catch (error) {
        console.error('Error loading trades:', error);
      }
    };
    loadTrades();
  }, []);

  // Load stock data from Yahoo
  useEffect(() => {
    if (!symbol) {
      setError('Invalid stock symbol');
      setIsLoading(false);
      return;
    }
    
    const loadStockData = async () => {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchStockData(symbol, timeRange);
      if (data) {
        setStockData(data);
        setError(null);
      } else {
        setError('Unable to load stock data');
      }
      setIsLoading(false);
    };
    
    loadStockData();
  }, [symbol, timeRange]);

  // Load news separately - depends on stockData for company name
  useEffect(() => {
    if (!symbol) {
      setIsNewsLoading(false);
      return;
    }
    
    const loadNews = async () => {
      setIsNewsLoading(true);
      // Pass company name for better filtering
      const companyName = stockData?.quote?.longName || stockData?.quote?.shortName;
      const newsData = await fetchStockNews(symbol, companyName);
      setNews(newsData);
      setIsNewsLoading(false);
    };
    
    loadNews();
  }, [symbol, stockData?.quote?.longName, stockData?.quote?.shortName]);

  const handleRefresh = async () => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);
    const data = await fetchStockData(symbol, timeRange);
    if (data) {
      setStockData(data);
      setError(null);
    } else {
      setError('Unable to load stock data');
    }
    setIsLoading(false);
  };

  // Calculate prices map for holdings calculation
  const prices = useMemo(() => {
    const priceMap = new Map<string, LivePrice>();
    if (stockData && symbol) {
      priceMap.set(symbol, {
        ticker: symbol,
        price: stockData.quote.regularMarketPrice,
        previousClose: stockData.quote.regularMarketPreviousClose,
        change: stockData.quote.regularMarketChange,
        changePercent: stockData.quote.regularMarketChangePercent,
        timestamp: Date.now(),
        source: 'yahoo',
      });
    }
    // Add prices for other holdings from trades
    trades.forEach(trade => {
      if (!priceMap.has(trade.ticker)) {
        priceMap.set(trade.ticker, {
          ticker: trade.ticker,
          price: trade.pricePerShare,
          timestamp: Date.now(),
          source: 'trade',
        });
      }
    });
    return priceMap;
  }, [stockData, symbol, trades]);

  const holding = useMemo(() => {
    if (!symbol || trades.length === 0) return null;
    const holdings = calculateHoldings(trades, prices);
    return holdings.find(h => h.ticker === symbol) || null;
  }, [symbol, prices, trades]);

  const chartData = stockData?.chartData || [];
  const quote = stockData?.quote;
  const stats = stockData?.stats;

  const baseline = chartData[0]?.value || quote?.regularMarketPreviousClose || 0;
  const currentPrice = quote?.regularMarketPrice || 0;
  const priceChange = quote?.regularMarketChange || 0;
  const priceChangePercent = quote?.regularMarketChangePercent || 0;
  const isPositive = priceChange >= 0;

  const minValue = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : 0;
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
  const padding = (maxValue - minValue) * 0.12 || 10;

  const marketState = quote ? getMarketStateLabel(quote.marketState) : null;

  // Get company name from holding or stock data
  const companyName = holding?.name || quote?.longName || quote?.shortName || symbol || rawSymbol;

  // Invalid symbol error
  if (!symbol) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 relative">
        <DecorativeBubbles variant="subtle" />
        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-loss/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-loss" />
          </div>
          <h2 className="text-lg font-bold font-display">Invalid Stock Symbol</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            "{rawSymbol}" is not a valid stock symbol. Please check and try again.
          </p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl relative z-10">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative bubbles */}
      <DecorativeBubbles variant="minimal" className="fixed" />
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-20 safe-area-top border-b border-border/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="touch-target h-9 w-9 rounded-xl hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-display leading-tight truncate max-w-[200px]">
                  {isLoading ? <Skeleton className="h-5 w-32" /> : companyName}
                </h1>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-semibold text-primary">{symbol}</span>
              </div>
              {marketState && !isLoading && (
                <p className={cn("text-xs font-medium", marketState.color)}>{marketState.label}</p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-9 w-9 rounded-xl hover:bg-primary/10"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 safe-area-bottom relative z-10">
        {/* Error State with Retry */}
        {error && !stockData && !isLoading && (
          <GradientCard className="p-6 text-center space-y-3" gradient="loss">
            <div className="w-12 h-12 rounded-xl bg-loss/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-loss" />
            </div>
            <div>
              <h3 className="font-bold font-display text-loss">{error}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't fetch data for {symbol}. Please try again.
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </GradientCard>
        )}

        {/* Price Header */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-6 w-36" />
            </>
          ) : stockData ? (
            <>
              <div className="flex items-baseline gap-3">
                <h2 className="text-4xl font-bold font-display">{formatCurrency(currentPrice)}</h2>
                <span className="text-sm text-muted-foreground font-medium">USD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
                  isPositive ? "bg-profit/15" : "bg-loss/15"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                  <span className={cn("text-sm font-bold", isPositive ? "text-profit" : "text-loss")}>
                    {isPositive ? '+' : ''}{formatCurrency(Math.abs(priceChange))} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">Today</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Trading Chart - Only show if loading or has data */}
        {(isLoading || stockData) && (
          <GradientCard className="p-4" glowOnHover>
            {/* Time Range Tabs */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto scroll-smooth-x pb-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  disabled={isLoading}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all touch-target min-w-[40px]",
                    timeRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isLoading && "opacity-50"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="h-56 w-full relative">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              ) : chartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={chartData}
                      margin={{ top: 8, right: 50, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="assetProfitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--profit))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="assetLossGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0} />
                          <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        domain={[minValue - padding, maxValue + padding]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                        orientation="right"
                        width={45}
                      />
                      
                      <ReferenceLine 
                        y={baseline} 
                        stroke="hsl(var(--muted-foreground) / 0.3)"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      
                      <ReferenceLine 
                        y={currentPrice} 
                        stroke={isPositive ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                        strokeDasharray="2 2"
                        strokeWidth={1.5}
                      />
                      
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border border-border/50 rounded-xl px-3 py-2 shadow-soft-lg">
                                <p className="text-sm font-semibold">
                                  {formatCurrency(data.value)}
                                </p>
                                <p className="text-xs text-muted-foreground">{data.label}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isPositive ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                        strokeWidth={2}
                        fill={isPositive ? 'url(#assetProfitGradient)' : 'url(#assetLossGradient)'}
                        animationDuration={400}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Current Price Badge */}
                  <div 
                    className={cn(
                      "absolute right-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white",
                      isPositive ? "bg-profit" : "bg-loss"
                    )}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {formatCurrency(currentPrice)}
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                  No chart data available for this time range
                </div>
              )}
            </div>
          </GradientCard>
        )}

        {/* Stats Grid - Only show if loading or has data */}
        {(isLoading || stockData) && (
          <GradientCard className="p-4 space-y-3" glowOnHover>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Statistics</h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-5" />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Close</span>
                  <span className={cn("font-medium", stats.prevClose === 'N/A' && "text-muted-foreground")}>{stats.prevClose === 'N/A' ? '—' : stats.prevClose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open</span>
                  <span className={cn("font-medium", stats.open === 'N/A' && "text-muted-foreground")}>{stats.open === 'N/A' ? '—' : stats.open}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Day's Range</span>
                  <span className={cn("font-medium text-xs", stats.dayRange === 'N/A' && "text-muted-foreground")}>{stats.dayRange === 'N/A' ? '—' : stats.dayRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">52-Week Range</span>
                  <span className={cn("font-medium text-xs", stats.yearRange === 'N/A' && "text-muted-foreground")}>{stats.yearRange === 'N/A' ? '—' : stats.yearRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className={cn("font-medium", stats.marketCap === 'N/A' && "text-muted-foreground")}>{stats.marketCap === 'N/A' ? '—' : stats.marketCap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className={cn("font-medium", stats.peRatio === 'N/A' && "text-muted-foreground")}>{stats.peRatio === 'N/A' ? '—' : stats.peRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS</span>
                  <span className={cn("font-medium", stats.eps === 'N/A' && "text-muted-foreground")}>{stats.eps === 'N/A' ? '—' : stats.eps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className={cn("font-medium", stats.volume === 'N/A' && "text-muted-foreground")}>{stats.volume === 'N/A' ? '—' : stats.volume}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Avg. Volume</span>
                  <span className={cn("font-medium", stats.avgVolume === 'N/A' && "text-muted-foreground")}>{stats.avgVolume === 'N/A' ? '—' : stats.avgVolume}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No statistics available</p>
            )}
          </GradientCard>
        )}

        {/* Your Position - Only show if user owns this stock */}
        {holding && (
          <GradientCard className="p-4 space-y-3" gradient="primary" glowOnHover>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">Your Position</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shares</span>
                <span className="font-semibold">{formatQuantity(holding.shares)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Cost</span>
                <span className="font-semibold">{formatCurrency(holding.averageBuyPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Value</span>
                <span className="font-semibold">{formatCurrency(holding.currentValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unrealized P/L</span>
                <span className={cn("font-semibold", holding.unrealizedPL >= 0 ? "text-profit" : "text-loss")}>
                  {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allocation</span>
                <span className="font-semibold">
                  {holding.allocationPercent <= 0 
                    ? '—' 
                    : holding.allocationPercent < 0.1 
                      ? '<0.1%' 
                      : `${holding.allocationPercent.toFixed(1)}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holding Period</span>
                <span className="font-semibold">{holding.holdingPeriodDays} days</span>
              </div>
            </div>
          </GradientCard>
        )}

        {/* News Section */}
        <GradientCard className="p-4 space-y-3" glowOnHover>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent News</h3>
          {isNewsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-b border-border/30 pb-3 last:border-0 last:pb-0 hover:bg-muted/20 -mx-2 px-2 py-1 rounded-xl transition-colors"
                >
                  <p className="text-sm font-medium leading-tight line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.publisher}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(item.providerPublishTime)}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent news for {symbol}</p>
          )}
        </GradientCard>
      </main>
    </div>
  );
}
