import { calculatePortfolioTotals, formatCurrency, formatPercent } from '@/lib/calculations';
import { Holding } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PieChart, Zap, Target } from 'lucide-react';
import { GradientCard } from '@/components/GradientCard';

interface PortfolioSummaryProps {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  const { totalValue, totalInvested, totalPL, totalPLPercent } = calculatePortfolioTotals(holdings);
  const isProfit = totalPL >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <GradientCard className="p-4" glowOnHover gradient="primary">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Wallet className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Total Value</span>
        </div>
        <p className="text-2xl font-bold font-display">{formatCurrency(totalValue)}</p>
      </GradientCard>

      <GradientCard className="p-4" glowOnHover gradient="accent">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <Target className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Invested</span>
        </div>
        <p className="text-2xl font-bold font-display">{formatCurrency(totalInvested)}</p>
      </GradientCard>

      <GradientCard className="p-4" glowOnHover gradient={isProfit ? 'profit' : 'loss'}>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center",
            isProfit ? "bg-profit/20" : "bg-loss/20"
          )}>
            {isProfit ? (
              <TrendingUp className="h-3.5 w-3.5 text-profit" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-loss" />
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Unrealized P/L</span>
        </div>
        <p className={cn("text-2xl font-bold font-display", isProfit ? "text-profit" : "text-loss")}>
          {isProfit ? '+' : ''}{formatCurrency(totalPL)}
        </p>
      </GradientCard>

      <GradientCard className="p-4" glowOnHover gradient={isProfit ? 'profit' : 'loss'}>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center",
            isProfit ? "bg-profit/20" : "bg-loss/20"
          )}>
            <Zap className={cn("h-3.5 w-3.5", isProfit ? "text-profit" : "text-loss")} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Return</span>
        </div>
        <p className={cn("text-2xl font-bold font-display", isProfit ? "text-profit" : "text-loss")}>
          {formatPercent(totalPLPercent)}
        </p>
      </GradientCard>
    </div>
  );
}
