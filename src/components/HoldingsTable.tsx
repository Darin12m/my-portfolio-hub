import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AssetLogo } from '@/components/AssetLogo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'name' | 'shares' | 'cashflow' | 'value' | 'pl' | 'allocation';
type SortDirection = 'asc' | 'desc';

interface HoldingsTableProps {
  holdings: Holding[];
  isLoading?: boolean;
  onDeleteHoldings?: (tickers: string[]) => void;
}

export function HoldingsTable({ holdings, isLoading, onDeleteHoldings }: HoldingsTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('allocation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEditMode = selectedTickers.size > 0;

  const handleSort = (field: SortField) => {
    if (isEditMode) return;
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
        case 'shares':
          comparison = a.shares - b.shares;
          break;
        case 'cashflow':
          comparison = a.investedAmount - b.investedAmount;
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
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const toggleSelection = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  const handleDelete = () => {
    if (onDeleteHoldings) {
      onDeleteHoldings(Array.from(selectedTickers));
    }
    setSelectedTickers(new Set());
    setShowDeleteDialog(false);
  };

  const handleRowClick = (holding: Holding) => {
    if (!isEditMode) {
      navigate(`/asset/${holding.ticker}`);
    }
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl">
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
      <div className="glass rounded-2xl">
        <div className="p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-foreground font-medium">No holdings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Import trades to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Table Header with count/selection */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEditMode ? `${selectedTickers.size} selected` : `${holdings.length} Holdings`}
        </span>
        {isEditMode && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-1 h-7 text-xs rounded-lg"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        )}
      </div>

      {/* Scrollable Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Table Header Row */}
          <div className="grid grid-cols-[minmax(180px,2fr)_repeat(5,1fr)] bg-secondary/30">
            {/* Security Header */}
            <div className="py-2.5 px-4">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Security
                {!isEditMode && <SortIcon field="name" />}
              </button>
            </div>

            {/* Shares Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('shares')}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Shares
              </button>
            </div>

            {/* Avg Cost Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('cashflow')}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Avg Cost
              </button>
            </div>

            {/* Value Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('value')}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Value
              </button>
            </div>

            {/* P/L Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('pl')}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                P/L
              </button>
            </div>

            {/* Allocation Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('allocation')}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Alloc
              </button>
            </div>
          </div>

          {/* Table Body - Modern card layout with liquid allocation */}
          <div className="divide-y divide-border/20">
            {sortedHoldings.map((holding, index) => (
              <div
                key={holding.ticker}
                onClick={() => handleRowClick(holding)}
                className={cn(
                  "relative grid grid-cols-[minmax(180px,2fr)_repeat(5,1fr)] cursor-pointer group",
                  "transition-all duration-300",
                  selectedTickers.has(holding.ticker) && "bg-primary/10",
                  !isEditMode && "hover:bg-primary/5",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* LIQUID ALLOCATION BACKGROUND - Gradient version */}
                <div 
                  className="absolute inset-y-1 left-1 rounded-full liquid-allocation pointer-events-none transition-all duration-500"
                  style={{ 
                    width: holding.allocationPercent >= 0 
                      ? `${Math.max(Math.min(holding.allocationPercent, 100), 0)}%` 
                      : '0%',
                    minWidth: holding.allocationPercent > 0 ? '12px' : '0',
                    height: '70%',
                    top: '15%',
                  }}
                  aria-hidden="true"
                />

                {/* Security Cell */}
                <div className="py-3.5 px-4 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTickers.has(holding.ticker)}
                      onCheckedChange={() => {}}
                      onClick={(e) => toggleSelection(holding.ticker, e)}
                      className={cn(
                        "flex-shrink-0 transition-all duration-200 border-muted-foreground/30",
                        isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    />
                    
                    {/* Logo with glow */}
                    <div className="relative">
                      <AssetLogo
                        ticker={holding.ticker}
                        name={holding.name}
                        size="sm"
                      />
                      <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Name & Ticker */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                        {holding.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        {holding.ticker}
                      </p>
                    </div>

                    {/* Arrow indicator on hover */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Shares */}
                <div className="py-3.5 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm font-medium">{formatQuantity(holding.shares)}</p>
                </div>

                {/* Avg Cost */}
                <div className="py-3.5 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm text-muted-foreground">{formatCurrency(holding.averageBuyPrice)}</p>
                </div>

                {/* Current Value */}
                <div className="py-3.5 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm font-semibold">{formatCurrency(holding.currentValue)}</p>
                </div>

                {/* P/L */}
                <div className="py-3.5 px-2 text-center flex flex-col items-center justify-center relative z-10">
                  <p className={cn(
                    "text-sm font-semibold",
                    holding.unrealizedPL >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)}
                  </p>
                  <p className={cn(
                    "text-[10px] font-medium",
                    holding.unrealizedPLPercent >= 0 ? "text-profit/80" : "text-loss/80"
                  )}>
                    {formatPercent(holding.unrealizedPLPercent)}
                  </p>
                </div>

                {/* Allocation */}
                <div className="py-3.5 px-2 text-center flex items-center justify-center relative z-10">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-8 h-1.5 rounded-full bg-secondary overflow-hidden"
                    >
                      <div 
                        className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                        style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {holding.allocationPercent >= 0 ? `${holding.allocationPercent.toFixed(1)}%` : '--'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Holdings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedTickers.size} holding{selectedTickers.size > 1 ? 's' : ''} and all related trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
