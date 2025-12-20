import { useState, useMemo } from 'react';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'name' | 'quantity' | 'value' | 'pl' | 'allocation';
type SortDirection = 'asc' | 'desc';

interface HoldingsTableProps {
  holdings: Holding[];
  isLoading?: boolean;
}

export function HoldingsTable({ holdings, isLoading }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'value':
          comparison = a.currentValue - b.currentValue;
          break;
        case 'pl':
          comparison = a.unrealizedPL - b.unrealizedPL;
          break;
        case 'allocation':
          comparison = a.allocationPercent - b.allocationPercent;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [holdings, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const getAccentColor = (index: number): string => {
    const colors = [
      'bg-chart-1',
      'bg-chart-2', 
      'bg-chart-3',
      'bg-chart-4',
      'bg-chart-5',
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="p-8 text-center">
          <div className="animate-pulse-subtle text-muted-foreground">
            Loading holdings...
          </div>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="p-12 text-center">
          <p className="text-muted-foreground">No holdings yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Import trades or connect an exchange to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Security
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Position
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cashflow / Share
                </span>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('value')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Value / Share
                  <SortIcon field="value" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('pl')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Net P/L
                  <SortIcon field="pl" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('allocation')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto"
                >
                  Allocation
                  <SortIcon field="allocation" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding, index) => (
              <tr 
                key={holding.symbol}
                className="border-b border-border/50 table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Security */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-12 rounded-full", getAccentColor(index))} />
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
                      <img
                        src={holding.logoUrl}
                        alt={holding.symbol}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-xs font-semibold text-muted-foreground hidden">
                        {holding.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <button className="font-medium text-primary hover:underline text-left">
                        {holding.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {holding.assetType === 'stock' ? holding.isin : holding.symbol}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Position */}
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium">{formatQuantity(holding.quantity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {holding.holdingPeriodDays} days
                    </p>
                  </div>
                </td>

                {/* Cashflow per share */}
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium">{formatCurrency(holding.investedAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(holding.cumulativeCashflowPerShare)} / share
                    </p>
                  </div>
                </td>

                {/* Value per share */}
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium">{formatCurrency(holding.currentValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(holding.valuePerShare)} / share
                    </p>
                  </div>
                </td>

                {/* Net P/L */}
                <td className="py-4 px-4">
                  <div>
                    <p className={cn(
                      "font-medium",
                      holding.unrealizedPL >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      holding.unrealizedPL >= 0 ? "text-profit/80" : "text-loss/80"
                    )}>
                      {formatPercent(holding.unrealizedPLPercent)}
                    </p>
                  </div>
                </td>

                {/* Allocation */}
                <td className="py-4 px-4 text-right">
                  <span className="text-sm font-medium text-muted-foreground">
                    {holding.allocationPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
