import { calculatePortfolioTotals, formatCurrency, formatPercent } from '@/lib/calculations';
import { Holding } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';

interface PortfolioSummaryProps {
  holdings: Holding[];
}

export function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  const { totalValue, totalInvested, totalPL, totalPLPercent } = calculatePortfolioTotals(holdings);
  const isProfit = totalPL >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Total Value</span>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <PieChart className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Invested</span>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-profit" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider">Unrealized P/L</span>
        </div>
        <p className={cn("text-2xl font-bold", isProfit ? "text-profit" : "text-loss")}>
          {isProfit ? '+' : ''}{formatCurrency(totalPL)}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-profit" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider">Return</span>
        </div>
        <p className={cn("text-2xl font-bold", isProfit ? "text-profit" : "text-loss")}>
          {formatPercent(totalPLPercent)}
        </p>
      </div>
    </div>
  );
}
