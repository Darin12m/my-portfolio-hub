import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CryptoHolding } from '@/services/exchangeApiService';
import { formatCurrency, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface CryptoHoldingsTableProps {
  holdings: CryptoHolding[];
  isLoading: boolean;
  viewMode: 'combined' | 'per-exchange';
}

interface CombinedHolding {
  symbol: string;
  quantity: number;
  valueUsd: number;
  exchanges: string[];
  allocationPercent: number;
}

const EXCHANGE_BADGES: Record<string, { bg: string; text: string }> = {
  binance: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  gateio: { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
};

export function CryptoHoldingsTable({ holdings, isLoading, viewMode }: CryptoHoldingsTableProps) {
  const [showValues, setShowValues] = useState(true);

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  }, [holdings]);

  const combinedHoldings = useMemo((): CombinedHolding[] => {
    if (viewMode !== 'combined') return [];

    const grouped = holdings.reduce((acc, h) => {
      if (!acc[h.symbol]) {
        acc[h.symbol] = {
          symbol: h.symbol,
          quantity: 0,
          valueUsd: 0,
          exchanges: [],
        };
      }
      acc[h.symbol].quantity += h.quantity;
      acc[h.symbol].valueUsd += h.valueUsd;
      if (!acc[h.symbol].exchanges.includes(h.exchange)) {
        acc[h.symbol].exchanges.push(h.exchange);
      }
      return acc;
    }, {} as Record<string, Omit<CombinedHolding, 'allocationPercent'>>);

    return Object.values(grouped)
      .map((h) => ({
        ...h,
        allocationPercent: totalValue > 0 ? (h.valueUsd / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings, viewMode, totalValue]);

  const perExchangeHoldings = useMemo(() => {
    if (viewMode !== 'per-exchange') return [];

    return [...holdings]
      .map((h) => ({
        ...h,
        allocationPercent: totalValue > 0 ? (h.valueUsd / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings, viewMode, totalValue]);

  const renderExchangeBadge = (exchange: string) => {
    const exchangeKey = exchange.toLowerCase();
    const colors = EXCHANGE_BADGES[exchangeKey] || {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
          colors.bg,
          colors.text
        )}
      >
        {exchange}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No crypto holdings found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect an exchange to sync your portfolio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle Values Visibility */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowValues(!showValues)}
          className="gap-2"
        >
          {showValues ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Values
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Values
            </>
          )}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">Coin</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value (USD)</TableHead>
              <TableHead className="text-right">Allocation</TableHead>
              {viewMode === 'per-exchange' && (
                <TableHead className="text-right">Exchange</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewMode === 'combined'
              ? combinedHoldings.map((holding) => (
                  <TableRow key={holding.symbol} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{holding.symbol}</span>
                        {holding.exchanges.length > 1 && (
                          <div className="flex gap-1">
                            {holding.exchanges.map((ex) => (
                              <span key={ex}>{renderExchangeBadge(ex)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {showValues ? formatQuantity(holding.quantity) : '••••'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {showValues ? formatCurrency(holding.valueUsd) : '••••'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {holding.allocationPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : perExchangeHoldings.map((holding, index) => (
                  <TableRow
                    key={`${holding.symbol}-${holding.exchange}-${index}`}
                    className="table-row-hover"
                  >
                    <TableCell>
                      <span className="font-medium">{holding.symbol}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {showValues ? formatQuantity(holding.quantity) : '••••'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {showValues ? formatCurrency(holding.valueUsd) : '••••'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {holding.allocationPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderExchangeBadge(holding.exchange)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center p-4 rounded-lg bg-card border border-border">
        <span className="font-medium">Total Value</span>
        <span className="text-xl font-bold">
          {showValues ? formatCurrency(totalValue) : '••••••'}
        </span>
      </div>
    </div>
  );
}
