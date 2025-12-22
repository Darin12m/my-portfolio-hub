import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Holding } from '@/types/portfolio';
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
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEditMode = selectedSymbols.size > 0;

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
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const toggleSelection = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDelete = () => {
    if (onDeleteHoldings) {
      onDeleteHoldings(Array.from(selectedSymbols));
    }
    setSelectedSymbols(new Set());
    setShowDeleteDialog(false);
  };

  const handleRowClick = (holding: Holding) => {
    if (!isEditMode) {
      navigate(`/asset/${holding.symbol}`);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/50 bg-card">
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
      <div className="rounded-lg border border-border/50 bg-card">
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
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      {/* Table Header with count/selection */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-muted/20">
        <span className="text-xs font-medium text-muted-foreground">
          {isEditMode ? `${selectedSymbols.size} selected` : `${holdings.length} Holdings`}
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

      {/* Table Header Row - Simplified single line headers */}
      <div className="grid grid-cols-[minmax(160px,1.5fr)_repeat(5,1fr)] bg-muted/10">
        {/* Security Header */}
        <div className="py-2 px-3">
          <button
            onClick={() => handleSort('name')}
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            Security
            {!isEditMode && <SortIcon field="name" />}
          </button>
        </div>

        {/* Position Header */}
        <div className="py-2 px-2 text-center">
          <button
            onClick={() => handleSort('quantity')}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            Shares
          </button>
        </div>

        {/* Avg Cost Header */}
        <div className="py-2 px-2 text-center">
          <button
            onClick={() => handleSort('cashflow')}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            Avg Cost
          </button>
        </div>

        {/* Value Header */}
        <div className="py-2 px-2 text-center">
          <button
            onClick={() => handleSort('value')}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            Value
          </button>
        </div>

        {/* P/L Header */}
        <div className="py-2 px-2 text-center">
          <button
            onClick={() => handleSort('pl')}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            P/L
          </button>
        </div>

        {/* Allocation Header */}
        <div className="py-2 px-2 text-center">
          <button
            onClick={() => handleSort('allocation')}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            disabled={isEditMode}
          >
            Alloc
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/20">
        {sortedHoldings.map((holding) => (
          <div
            key={holding.symbol}
            onClick={() => handleRowClick(holding)}
            className={cn(
              "grid grid-cols-[minmax(160px,1.5fr)_repeat(5,1fr)] cursor-pointer",
              "transition-colors duration-100",
              selectedSymbols.has(holding.symbol) && "bg-primary/5",
              !isEditMode && "hover:bg-muted/30"
            )}
          >
            {/* Security Cell */}
            <div className="py-2.5 px-3 relative overflow-hidden">
              {/* Allocation Bar - subtle */}
              <div 
                className="absolute inset-y-0.5 left-0 right-0 pointer-events-none"
                aria-hidden="true"
              >
                <div 
                  className="h-full rounded-r allocation-bar-subtle"
                  style={{ 
                    width: holding.allocationPercent >= 0 ? `${Math.min(holding.allocationPercent, 100)}%` : '0%',
                    minWidth: holding.allocationPercent > 0 ? '2px' : '0',
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex items-center gap-2 relative z-10">
                {/* Checkbox on long-press / hover in edit mode */}
                <Checkbox
                  checked={selectedSymbols.has(holding.symbol)}
                  onCheckedChange={() => {}}
                  onClick={(e) => toggleSelection(holding.symbol, e)}
                  className={cn(
                    "flex-shrink-0 transition-opacity",
                    isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />
                
                {/* Logo */}
                <AssetLogo
                  symbol={holding.symbol}
                  name={holding.name}
                  assetType={holding.assetType}
                  size="sm"
                />
                
                {/* Name & Symbol */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate leading-tight">
                    {holding.symbol}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {holding.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Shares */}
            <div className="py-2.5 px-2 text-center flex items-center justify-center">
              <p className="text-sm font-medium">{formatQuantity(holding.quantity)}</p>
            </div>

            {/* Avg Cost */}
            <div className="py-2.5 px-2 text-center flex items-center justify-center">
              <p className="text-sm">{formatCurrency(holding.averageBuyPrice)}</p>
            </div>

            {/* Current Value */}
            <div className="py-2.5 px-2 text-center flex items-center justify-center">
              <p className="text-sm font-medium">{formatCurrency(holding.currentValue)}</p>
            </div>

            {/* P/L */}
            <div className="py-2.5 px-2 text-center flex flex-col items-center justify-center">
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

            {/* Allocation */}
            <div className="py-2.5 px-2 text-center flex items-center justify-center">
              <p className="text-sm">
                {holding.allocationPercent >= 0 ? `${holding.allocationPercent.toFixed(1)}%` : '--'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holdings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedSymbols.size} holding{selectedSymbols.size > 1 ? 's' : ''} and all related trades. This action cannot be undone.
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