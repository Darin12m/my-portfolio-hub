import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
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
      <div className="card-soft">
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
      <div className="card-soft">
        <div className="p-10 text-center">
          <p className="text-muted-foreground">No holdings yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Import trades to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft overflow-hidden">
      {/* Table Header with count/selection */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <span className="text-xs font-medium text-muted-foreground">
          {isEditMode ? `${selectedTickers.size} selected` : `${holdings.length} Holdings`}
        </span>
        {isEditMode && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-1 h-7 text-xs"
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
          <div className="grid grid-cols-[minmax(180px,2fr)_repeat(5,1fr)] bg-muted/30">
            {/* Security Header */}
            <div className="py-2.5 px-4">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
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
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Shares
              </button>
            </div>

            {/* Avg Cost Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('cashflow')}
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Avg Cost
              </button>
            </div>

            {/* Value Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('value')}
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Value
              </button>
            </div>

            {/* P/L Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('pl')}
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                P/L
              </button>
            </div>

            {/* Allocation Header */}
            <div className="py-2.5 px-2 text-center">
              <button
                onClick={() => handleSort('allocation')}
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                disabled={isEditMode}
              >
                Alloc
              </button>
            </div>
          </div>

          {/* Table Body - Mobile-friendly card layout with liquid allocation */}
          <div className="divide-y divide-border/10">
            {sortedHoldings.map((holding, index) => (
              <div
                key={holding.ticker}
                onClick={() => handleRowClick(holding)}
                className={cn(
                  "relative grid grid-cols-[minmax(180px,2fr)_repeat(5,1fr)] cursor-pointer",
                  "transition-all duration-200",
                  selectedTickers.has(holding.ticker) && "bg-primary/5",
                  !isEditMode && "hover:bg-muted/20",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* LIQUID ALLOCATION BACKGROUND - Design 1 Core Feature */}
                <div 
                  className="absolute inset-y-1 left-1 rounded-full liquid-allocation pointer-events-none"
                  style={{ 
                    width: holding.allocationPercent >= 0 
                      ? `${Math.max(Math.min(holding.allocationPercent, 100), 0)}%` 
                      : '0%',
                    minWidth: holding.allocationPercent > 0 ? '8px' : '0',
                    height: '65%',
                    top: '17.5%',
                  }}
                  aria-hidden="true"
                />

                {/* Security Cell */}
                <div className="py-3 px-4 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTickers.has(holding.ticker)}
                      onCheckedChange={() => {}}
                      onClick={(e) => toggleSelection(holding.ticker, e)}
                      className={cn(
                        "flex-shrink-0 transition-opacity",
                        isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    />
                    
                    {/* Logo */}
                    <AssetLogo
                      ticker={holding.ticker}
                      name={holding.name}
                      size="sm"
                    />
                    
                    {/* Name & Ticker */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate leading-tight">
                        {holding.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {holding.ticker}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shares */}
                <div className="py-3 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm">{formatQuantity(holding.shares)}</p>
                </div>

                {/* Avg Cost */}
                <div className="py-3 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm text-muted-foreground">{formatCurrency(holding.averageBuyPrice)}</p>
                </div>

                {/* Current Value */}
                <div className="py-3 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm font-medium">{formatCurrency(holding.currentValue)}</p>
                </div>

                {/* P/L */}
                <div className="py-3 px-2 text-center flex flex-col items-center justify-center relative z-10">
                  <p className={cn(
                    "text-sm font-medium",
                    holding.unrealizedPL >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)}
                  </p>
                  <p className={cn(
                    "text-[10px]",
                    holding.unrealizedPLPercent >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {formatPercent(holding.unrealizedPLPercent)}
                  </p>
                </div>

                {/* Allocation - subtle, right-aligned */}
                <div className="py-3 px-2 text-center flex items-center justify-center relative z-10">
                  <p className="text-sm text-muted-foreground">
                    {holding.allocationPercent >= 0 ? `${holding.allocationPercent.toFixed(1)}%` : '--'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holdings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedTickers.size} holding{selectedTickers.size > 1 ? 's' : ''} and all related trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
