import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, X } from 'lucide-react';
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
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Table Header with Edit Button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {holdings.length} Holdings
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && selectedSymbols.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-1.5 h-8"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          <Button
            variant={isEditMode ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5 h-8"
            onClick={isEditMode ? exitEditMode : () => setIsEditMode(true)}
          >
            {isEditMode ? (
              <>
                <X className="h-3.5 w-3.5" />
                Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table Header Row */}
      <div className="grid grid-cols-[minmax(180px,1.5fr)_repeat(5,1fr)] border-b border-border/60 bg-muted/20">
        {/* Security Header */}
        <div className="py-2.5 px-3 border-r border-border/40">
          <div className="flex items-center gap-2">
            {isEditMode && <div className="w-5" />}
            <button
              onClick={() => handleSort('name')}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              disabled={isEditMode}
            >
              Security
              {!isEditMode && <SortIcon field="name" />}
            </button>
          </div>
        </div>

        {/* Position Header */}
        <div className="py-2.5 px-2 text-center border-r border-border/40">
          <button
            onClick={() => handleSort('quantity')}
            className="flex flex-col items-center gap-0 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
            disabled={isEditMode}
          >
            <span>Position</span>
            <span>Holding</span>
            {!isEditMode && <SortIcon field="quantity" />}
          </button>
        </div>

        {/* Cashflow Header */}
        <div className="py-2.5 px-2 text-center border-r border-border/40">
          <button
            onClick={() => handleSort('cashflow')}
            className="flex flex-col items-center gap-0 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
            disabled={isEditMode}
          >
            <span>Cashflow</span>
            <span>Per Share</span>
            {!isEditMode && <SortIcon field="cashflow" />}
          </button>
        </div>

        {/* Value Header */}
        <div className="py-2.5 px-2 text-center border-r border-border/40">
          <button
            onClick={() => handleSort('value')}
            className="flex flex-col items-center gap-0 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
            disabled={isEditMode}
          >
            <span>Value</span>
            <span>Per Share</span>
            {!isEditMode && <SortIcon field="value" />}
          </button>
        </div>

        {/* Net P/L Header */}
        <div className="py-2.5 px-2 text-center border-r border-border/40">
          <button
            onClick={() => handleSort('pl')}
            className="flex flex-col items-center gap-0 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
            disabled={isEditMode}
          >
            <span>Net P/L</span>
            <span>In %</span>
            {!isEditMode && <SortIcon field="pl" />}
          </button>
        </div>

        {/* Allocation Header */}
        <div className="py-2.5 px-2 text-center">
          <button
            onClick={() => handleSort('allocation')}
            className="flex flex-col items-center gap-0 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto leading-tight"
            disabled={isEditMode}
          >
            <span>Alloc</span>
            <span>%</span>
            {!isEditMode && <SortIcon field="allocation" />}
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/30">
        {sortedHoldings.map((holding) => (
          <div
            key={holding.symbol}
            onClick={() => handleRowClick(holding)}
            className={cn(
              "grid grid-cols-[minmax(180px,1.5fr)_repeat(5,1fr)] cursor-pointer",
              "transition-colors duration-150",
              isEditMode && selectedSymbols.has(holding.symbol) && "bg-primary/5",
              !isEditMode && "hover:bg-muted/40 active:bg-muted/60"
            )}
          >
            {/* Security Cell */}
            <div className="py-2.5 px-3 relative overflow-hidden border-r border-border/40">
              {/* Allocation Bar - behind content with gradient fade */}
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                <div 
                  className="h-full rounded-r transition-all duration-500 ease-out allocation-bar"
                  style={{ 
                    width: `${Math.min(holding.allocationPercent, 100)}%`,
                    minWidth: holding.allocationPercent > 0 ? '4px' : '0',
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
                
                {/* Logo */}
                <AssetLogo
                  symbol={holding.symbol}
                  name={holding.name}
                  assetType={holding.assetType}
                  size="md"
                />
                
                {/* Name & ISIN */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#2563eb] text-sm truncate leading-tight hover:underline">
                    {holding.name}
                  </p>
                  <p className="text-[10px] text-[#6b7280] truncate">
                    {holding.assetType === 'stock' ? holding.isin : holding.symbol}
                  </p>
                </div>
              </div>
            </div>

            {/* Position / Holding Period */}
            <div className="py-2.5 px-2 text-center border-r border-border/40 flex flex-col justify-center">
              <p className="font-semibold text-sm text-foreground">{formatQuantity(holding.quantity)}</p>
              <p className="text-[10px] text-[#6b7280]">
                {holding.holdingPeriodDays} days
              </p>
            </div>

            {/* Cumulative Cashflow */}
            <div className="py-2.5 px-2 text-center border-r border-border/40 flex flex-col justify-center">
              <p className="font-semibold text-sm text-foreground">{formatCurrency(holding.investedAmount)}</p>
              <p className="text-[10px] text-[#6b7280]">
                {formatCurrency(holding.averageBuyPrice)}/share
              </p>
            </div>

            {/* Value Per Share */}
            <div className="py-2.5 px-2 text-center border-r border-border/40 flex flex-col justify-center">
              <p className="font-semibold text-sm text-foreground">{formatCurrency(holding.currentValue)}</p>
              <p className="text-[10px] text-[#6b7280]">
                {formatCurrency(holding.currentPrice)}/share
              </p>
            </div>

            {/* Net Profit/Loss */}
            <div className="py-2.5 px-2 text-center border-r border-border/40 flex flex-col justify-center">
              <p className={cn(
                "font-semibold text-sm",
                holding.unrealizedPL >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
              )}>
                {holding.unrealizedPL >= 0 ? '' : '-'}${Math.abs(holding.unrealizedPL).toFixed(2)}
              </p>
              <p className={cn(
                "text-[10px] font-medium",
                holding.unrealizedPLPercent >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"
              )}>
                {holding.unrealizedPLPercent >= 0 ? '' : '-'}{Math.abs(holding.unrealizedPLPercent).toFixed(2)}%
              </p>
            </div>

            {/* Allocation */}
            <div className="py-2.5 px-2 text-center flex items-center justify-center">
              <p className="font-medium text-sm text-foreground">
                {holding.allocationPercent.toFixed(2)}%
              </p>
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
