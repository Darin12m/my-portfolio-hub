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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-soft p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <Wallet className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Total Value</span>
        </div>
        <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
      </div>

      <div className="card-soft p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <PieChart className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Invested</span>
        </div>
        <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
      </div>

      <div className="card-soft p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          {isProfit ? (
            <TrendingUp className="h-3.5 w-3.5 text-profit" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-loss" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider">Unrealized P/L</span>
        </div>
        <p className={cn("text-xl font-bold", isProfit ? "text-profit" : "text-loss")}>
          {isProfit ? '+' : ''}{formatCurrency(totalPL)}
        </p>
      </div>

      <div className="card-soft p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          {isProfit ? (
            <TrendingUp className="h-3.5 w-3.5 text-profit" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-loss" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider">Return</span>
        </div>
        <p className={cn("text-xl font-bold", isProfit ? "text-profit" : "text-loss")}>
          {formatPercent(totalPLPercent)}
        </p>
      </div>
    </div>
  );
}
