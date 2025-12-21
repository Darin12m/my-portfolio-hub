import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Holding } from '@/types/portfolio';
import { calculatePortfolioTotals, formatCurrency } from '@/lib/calculations';

interface PortfolioChartProps {
  holdings: Holding[];
}

// Generate mock historical data based on current value
function generateHistoricalData(currentValue: number) {
  const now = Date.now();
  const data = [];
  const baseValue = currentValue * 0.85; // Start at 85% of current
  
  for (let i = 24; i >= 0; i--) {
    const time = now - i * 3600000; // hourly data
    const variation = Math.random() * 0.08 - 0.02; // -2% to +6%
    const progress = (24 - i) / 24;
    const value = baseValue + (currentValue - baseValue) * progress + currentValue * variation;
    
    data.push({
      time,
      value: Math.max(0, value),
      label: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
  
  // Ensure last value matches current
  data[data.length - 1].value = currentValue;
  
  return data;
}

export function PortfolioChart({ holdings }: PortfolioChartProps) {
  const { totalValue } = calculatePortfolioTotals(holdings);
  
  const chartData = useMemo(() => {
    return generateHistoricalData(totalValue);
  }, [totalValue]);

  const minValue = Math.min(...chartData.map(d => d.value));
  const maxValue = Math.max(...chartData.map(d => d.value));
  const padding = (maxValue - minValue) * 0.1;

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            hide 
          />
          <YAxis 
            domain={[minValue - padding, maxValue + padding]} 
            hide 
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-sm font-medium">{formatCurrency(payload[0].value as number)}</p>
                    <p className="text-xs text-muted-foreground">{payload[0].payload.label}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
