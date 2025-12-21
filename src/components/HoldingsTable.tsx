import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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

type SortField = 'name' | 'quantity' | 'cashflow' | 'value' | 'pl' | 'allocation';
type SortDirection = 'asc' | 'desc';

interface HoldingsTableProps {
  holdings: Holding[];
  isLoading?: boolean;
  onDeleteHoldings?: (symbols: string[]) => void;
}

export function HoldingsTable({ holdings, isLoading, onDeleteHoldings }: HoldingsTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('allocation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll between header and body
  const handleBodyScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

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
        case 'quantity':
          comparison = a.quantity - b.quantity;
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
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary flex-shrink-0" />
      : <ArrowDown className="h-3 w-3 text-primary flex-shrink-0" />;
  };

  const toggleSelection = (symbol: string) => {
    setSelectedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSymbols.size === holdings.length) {
      setSelectedSymbols(new Set());
    } else {
      setSelectedSymbols(new Set(holdings.map(h => h.symbol)));
    }
  };

  const handleDelete = () => {
    if (onDeleteHoldings) {
      onDeleteHoldings(Array.from(selectedSymbols));
    }
    setSelectedSymbols(new Set());
    setIsEditMode(false);
    setShowDeleteDialog(false);
  };

  const handleRowClick = (holding: Holding) => {
    if (isEditMode) {
      toggleSelection(holding.symbol);
    } else {
      navigate(`/asset/${holding.symbol}`);
    }
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedSymbols(new Set());
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm">
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
      <div className="rounded-2xl border border-border bg-card shadow-sm">
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
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Table Header with Edit Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <Checkbox
                checked={selectedSymbols.size === holdings.length}
                onCheckedChange={toggleSelectAll}
                className="touch-target"
              />
              <span className="text-sm text-muted-foreground">
                {selectedSymbols.size} selected
              </span>
            </>
          )}
          {!isEditMode && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {holdings.length} Holdings
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && selectedSymbols.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-1.5"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            variant={isEditMode ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={isEditMode ? exitEditMode : () => setIsEditMode(true)}
          >
            {isEditMode ? (
              <>
                <X className="h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table Header Row */}
      <div className="flex border-b border-border bg-secondary/10">
        {/* Fixed Security Header */}
        <div className={cn(
          "flex-shrink-0 py-3 px-4 border-r border-border/30",
          isEditMode ? "w-[200px]" : "w-[180px]"
        )}>
          <div className="flex items-center gap-2">
            {isEditMode && <div className="w-5" />}
            <button
              onClick={() => handleSort('name')}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              disabled={isEditMode}
            >
              Security
              {!isEditMode && <SortIcon field="name" />}
            </button>
          </div>
        </div>

        {/* Scrollable Headers */}
        <div 
          ref={headerScrollRef}
          className="flex-1 overflow-hidden"
        >
          <div className="flex min-w-max">
            <div className="w-[100px] py-3 px-3 text-center">
              <button
                onClick={() => handleSort('quantity')}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
                disabled={isEditMode}
              >
                <span>Position</span>
                <span>Holding</span>
                <span>Period</span>
                {!isEditMode && <SortIcon field="quantity" />}
              </button>
            </div>
            <div className="w-[120px] py-3 px-3 text-center">
              <button
                onClick={() => handleSort('cashflow')}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
                disabled={isEditMode}
              >
                <span>Cumulative</span>
                <span>Cashflow</span>
                <span>Per Share</span>
                {!isEditMode && <SortIcon field="cashflow" />}
              </button>
            </div>
            <div className="w-[100px] py-3 px-3 text-center">
              <button
                onClick={() => handleSort('value')}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
                disabled={isEditMode}
              >
                <span>Value</span>
                <span>Per Share</span>
                {!isEditMode && <SortIcon field="value" />}
              </button>
            </div>
            <div className="w-[100px] py-3 px-3 text-center">
              <button
                onClick={() => handleSort('pl')}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
                disabled={isEditMode}
              >
                <span>Net</span>
                <span>Profit/Loss</span>
                <span>In %</span>
                {!isEditMode && <SortIcon field="pl" />}
              </button>
            </div>
            <div className="w-[80px] py-3 px-3 text-center">
              <button
                onClick={() => handleSort('allocation')}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
                disabled={isEditMode}
              >
                <span>Allocation</span>
                <span>%</span>
                {!isEditMode && <SortIcon field="allocation" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/40">
        {sortedHoldings.map((holding) => (
          <div
            key={holding.symbol}
            onClick={() => handleRowClick(holding)}
            className={cn(
              "flex touch-feedback cursor-pointer",
              "transition-all duration-200",
              isEditMode && selectedSymbols.has(holding.symbol) && "bg-primary/5",
              !isEditMode && "hover:bg-secondary/30 active:bg-secondary/50"
            )}
          >
            {/* Fixed Security Cell */}
            <div className={cn(
              "flex-shrink-0 py-3 px-4 relative overflow-hidden border-r border-border/30",
              isEditMode ? "w-[200px]" : "w-[180px]"
            )}>
              {/* Allocation Bar - behind content */}
              <div 
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              >
                <div 
                  className="h-full bg-allocation-bar/10 dark:bg-allocation-bar/20 allocation-bar-enter rounded-r-lg"
                  style={{ 
                    width: `${Math.min(holding.allocationPercent, 100)}%`,
                    minWidth: holding.allocationPercent > 0 ? '4px' : '0'
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex items-center gap-2 relative z-10">
                {isEditMode && (
                  <Checkbox
                    checked={selectedSymbols.has(holding.symbol)}
                    onCheckedChange={() => toggleSelection(holding.symbol)}
                    onClick={(e) => e.stopPropagation()}
                    className="touch-target flex-shrink-0"
                  />
                )}
                
                {/* Accent bar */}
                <div className="w-1 h-10 rounded-full flex-shrink-0 bg-primary/60" />
                
                {/* Logo */}
                <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                  <img
                    src={holding.logoUrl}
                    alt={holding.symbol}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="text-xs font-semibold text-muted-foreground hidden">
                    {holding.symbol.substring(0, 2)}
                  </span>
                </div>
                
                {/* Name & ISIN */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-primary text-sm truncate leading-tight">
                    {holding.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {holding.assetType === 'stock' ? holding.isin : holding.symbol}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Data Cells */}
            <div 
              ref={bodyScrollRef}
              onScroll={handleBodyScroll}
              className="flex-1 overflow-x-auto scroll-smooth-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex min-w-max">
                {/* Position / Holding Period */}
                <div className="w-[100px] py-3 px-3 text-center">
                  <p className="font-medium text-sm">{formatQuantity(holding.quantity)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {holding.holdingPeriodDays} days
                  </p>
                </div>

                {/* Cumulative Cashflow */}
                <div className="w-[120px] py-3 px-3 text-center">
                  <p className="font-medium text-sm">{formatCurrency(holding.investedAmount)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(holding.averageBuyPrice)}/share
                  </p>
                </div>

                {/* Value Per Share */}
                <div className="w-[100px] py-3 px-3 text-center">
                  <p className="font-medium text-sm">{formatCurrency(holding.currentValue)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(holding.currentPrice)}/share
                  </p>
                </div>

                {/* Net Profit/Loss */}
                <div className="w-[100px] py-3 px-3 text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    holding.unrealizedPL >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPL)}
                  </p>
                  <p className={cn(
                    "text-[11px]",
                    holding.unrealizedPLPercent >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {holding.unrealizedPLPercent >= 0 ? '+' : ''}{formatPercent(holding.unrealizedPLPercent)}
                  </p>
                </div>

                {/* Allocation */}
                <div className="w-[80px] py-3 px-3 text-center">
                  <p className="font-medium text-sm text-muted-foreground">
                    {formatPercent(holding.allocationPercent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="safe-area-inset">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holdings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedSymbols.size} holding{selectedSymbols.size > 1 ? 's' : ''} and all related trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="touch-target">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-target"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
