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
      <div className="scroll-smooth-x">
        <table className="w-full">
          <thead className="sticky-header">
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target"
                >
                  Security
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target"
                >
                  Position
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="text-left py-3 px-4 hidden sm:table-cell">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cashflow / Share
                </span>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('value')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target"
                >
                  Value / Share
                  <SortIcon field="value" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('pl')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target"
                >
                  Net P/L
                  <SortIcon field="pl" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('allocation')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto touch-target"
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
                className="border-b border-border/50 table-row-hover touch-feedback animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Security with Allocation Bar */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3 relative">
                    {/* Allocation Bar Background */}
                    <div 
                      className="absolute inset-0 bg-allocation-bar/10 rounded-lg allocation-bar-enter pointer-events-none"
                      style={{ 
                        width: `${Math.min(holding.allocationPercent, 100)}%`,
                        minWidth: holding.allocationPercent > 0 ? '8px' : '0'
                      }}
                    />
                    
                    {/* Content on top */}
                    <div className="relative flex items-center gap-3 z-10">
                      <div className={cn("w-1 h-12 rounded-full flex-shrink-0", getAccentColor(index))} />
                      <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                      <div className="min-w-0">
                        <button className="font-medium text-primary hover:underline text-left truncate block max-w-[150px] sm:max-w-none">
                          {holding.name}
                        </button>
                        <p className="text-xs text-muted-foreground truncate">
                          {holding.assetType === 'stock' ? holding.isin : holding.symbol}
                        </p>
                      </div>
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

                {/* Cashflow per share - hidden on small screens */}
                <td className="py-4 px-4 hidden sm:table-cell">
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
