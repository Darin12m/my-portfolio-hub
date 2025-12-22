import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { Holding, Trade } from '@/types/portfolio';
import { calculatePortfolioTotals, formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface TradingChartProps {
  holdings: Holding[];
  trades?: Trade[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'All';
type BaselineType = 'Previous Close' | 'Average';

const TIME_RANGES: TimeRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'All'];

interface ChartDataPoint {
  time: number;
  value: number;
  label: string;
}

// Generate mock historical data based on range and current value
function generateMockChartData(currentValue: number, range: TimeRange): ChartDataPoint[] {
  const now = Date.now();
  const data: ChartDataPoint[] = [];
  
  let points: number;
  let interval: number;
  let variation: number;
  
  switch (range) {
    case '1D':
      points = 78;
      interval = 5 * 60 * 1000;
      variation = 0.02;
      break;
    case '5D':
      points = 40;
      interval = 3 * 60 * 60 * 1000;
      variation = 0.04;
      break;
    case '1M':
      points = 22;
      interval = 24 * 60 * 60 * 1000;
      variation = 0.06;
      break;
    case '6M':
      points = 26;
      interval = 7 * 24 * 60 * 60 * 1000;
      variation = 0.12;
      break;
    case 'YTD':
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      points = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
      interval = 7 * 24 * 60 * 60 * 1000;
      variation = 0.15;
      break;
    case '1Y':
      points = 52;
      interval = 7 * 24 * 60 * 60 * 1000;
      variation = 0.2;
      break;
    case '5Y':
      points = 60;
      interval = 30 * 24 * 60 * 60 * 1000;
      variation = 0.4;
      break;
    case 'All':
      points = 80;
      interval = 45 * 24 * 60 * 60 * 1000;
      variation = 0.5;
      break;
    default:
      points = 78;
      interval = 5 * 60 * 1000;
      variation = 0.02;
  }
  
  const startMultiplier = 1 - variation + Math.random() * variation;
  let value = currentValue * startMultiplier;
  
  for (let i = points; i >= 0; i--) {
    const time = now - i * interval;
    const change = (Math.random() - 0.48) * variation * 0.08 * currentValue;
    value = Math.max(value + change, currentValue * 0.5);
    
    data.push({
      time,
      value,
      label: formatTimeLabel(time, range),
    });
  }
  
  // Ensure last value matches current
  if (data.length > 0) {
    data[data.length - 1].value = currentValue;
  }
  
  return data;
}

function formatTimeLabel(timestamp: number, range: TimeRange): string {
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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function TradingChart({ holdings, onRefresh, isLoading }: TradingChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [baselineType, setBaselineType] = useState<BaselineType>('Previous Close');
  const [chartKey, setChartKey] = useState(0);
  
  const { totalValue, totalPL, totalPLPercent } = calculatePortfolioTotals(holdings);
  
  // Regenerate chart data when range or holdings change
  const chartData = useMemo(() => {
    return generateMockChartData(totalValue, timeRange);
  }, [totalValue, timeRange, chartKey]);
  
  const baseline = useMemo(() => {
    if (chartData.length === 0) return totalValue;
    if (baselineType === 'Previous Close') {
      return chartData[0]?.value || totalValue;
    }
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return sum / chartData.length;
  }, [chartData, baselineType, totalValue]);
  
  const currentPrice = totalValue;
  
  // Determine if performance is positive (GREEN) or negative (RED)
  const isPositive = totalPL >= 0;
  
  const minValue = chartData.length > 0 
    ? Math.min(...chartData.map(d => d.value), baseline)
    : 0;
  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.value), baseline)
    : totalValue;
  const padding = (maxValue - minValue) * 0.15 || totalValue * 0.1;

  const handleRefresh = () => {
    setChartKey(prev => prev + 1);
    onRefresh?.();
  };

  // No data state
  if (holdings.length === 0) {
    return (
      <div className="trading-chart-container">
        <div className="flex items-center justify-center h-56 text-muted-foreground">
          <p>Import trades to see portfolio chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trading-chart-container">
      {/* Chart Controls - Simplified */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {/* Time Range Tabs */}
        <div className="flex items-center gap-0.5 bg-chart-surface rounded-lg p-0.5 overflow-x-auto scroll-smooth-x">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all min-w-[36px]",
                timeRange === range
                  ? "bg-chart-active text-chart-active-foreground"
                  : "text-chart-muted hover:text-chart-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
        
        {/* Right Controls - Simplified */}
        <div className="flex items-center gap-1">
          {/* Refresh Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-chart-muted hover:text-chart-foreground"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          
          {/* Baseline Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-chart-muted hover:text-chart-foreground">
                Baseline <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-chart-popover border-chart-border">
              <DropdownMenuItem onClick={() => setBaselineType('Previous Close')}>
                Previous Close
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBaselineType('Average')}>
                Average
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Price Header - Uses GREEN for profit, RED for loss */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-semibold text-chart-foreground">
            {formatCurrency(currentPrice)}
          </span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
            isPositive 
              ? "bg-chart-profit/10 text-chart-profit" 
              : "bg-chart-loss/10 text-chart-loss"
          )}>
            <span>{isPositive ? '+' : ''}{formatCurrency(totalPL)}</span>
            <span>({isPositive ? '+' : ''}{totalPLPercent.toFixed(2)}%)</span>
          </div>
        </div>
        <p className="text-xs text-chart-muted mt-0.5">
          Total P/L from invested amount
        </p>
      </div>
      
      {/* Main Chart - Line and fill color based on performance */}
      <div className="h-52 sm:h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData}
            margin={{ top: 8, right: 55, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Green gradient for positive performance */}
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-profit))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--chart-profit))" stopOpacity={0} />
              </linearGradient>
              {/* Red gradient for negative performance */}
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-loss))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--chart-loss))" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--chart-muted))', fontSize: 10 }}
              interval="preserveStartEnd"
              tickCount={5}
            />
            <YAxis 
              domain={[minValue - padding, maxValue + padding]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--chart-muted))', fontSize: 10 }}
              tickFormatter={(val) => formatCurrency(val).replace('$', '')}
              orientation="right"
              width={50}
            />
            
            {/* Baseline Reference Line */}
            <ReferenceLine 
              y={baseline} 
              stroke="hsl(var(--chart-baseline))"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            
            {/* Current Price Reference Line */}
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
            
            {/* Area fill - GREEN for positive, RED for negative */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}
              strokeWidth={2}
              fill={isPositive ? 'url(#profitGradient)' : 'url(#lossGradient)'}
              animationDuration={500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Current Price Badge - GREEN or RED */}
        <div 
          className={cn(
            "absolute right-0 px-2 py-0.5 rounded text-xs font-medium",
            isPositive 
              ? "bg-chart-profit text-white" 
              : "bg-chart-loss text-white"
          )}
          style={{ 
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          {formatCurrency(currentPrice)}
        </div>
      </div>
    </div>
  );
}