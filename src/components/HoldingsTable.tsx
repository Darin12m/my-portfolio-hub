import { useState, useMemo } from 'react';
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

type SortField = 'name' | 'quantity' | 'value' | 'pl' | 'allocation';
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

      {/* Table */}
      <div className="scroll-smooth-x">
        <table className="w-full">
          <thead className="sticky-header">
            <tr className="border-b border-border bg-secondary/10">
              {isEditMode && (
                <th className="w-12 py-3 px-4" />
              )}
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target"
                  disabled={isEditMode}
                >
                  Security
                  {!isEditMode && <SortIcon field="name" />}
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors touch-target ml-auto"
                  disabled={isEditMode}
                >
                  Holding Period
                  {!isEditMode && <SortIcon field="quantity" />}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding, index) => (
              <tr 
                key={holding.symbol}
                onClick={() => handleRowClick(holding)}
                className={cn(
                  "border-b border-border/40 touch-feedback cursor-pointer relative overflow-hidden",
                  "transition-all duration-200",
                  isEditMode && selectedSymbols.has(holding.symbol) && "bg-primary/5",
                  !isEditMode && "hover:bg-secondary/30 active:bg-secondary/50"
                )}
              >
                {/* Allocation Bar - absolute background */}
                <td 
                  colSpan={isEditMode ? 3 : 2} 
                  className="absolute inset-0 pointer-events-none p-0"
                  aria-hidden="true"
                >
                  <div 
                    className="h-full bg-allocation-bar/8 dark:bg-allocation-bar/15 allocation-bar-enter rounded-r-lg"
                    style={{ 
                      width: `${Math.min(holding.allocationPercent, 100)}%`,
                      minWidth: holding.allocationPercent > 0 ? '4px' : '0'
                    }}
                  />
                </td>

                {/* Checkbox */}
                {isEditMode && (
                  <td className="relative py-4 px-4 w-12">
                    <Checkbox
                      checked={selectedSymbols.has(holding.symbol)}
                      onCheckedChange={() => toggleSelection(holding.symbol)}
                      onClick={(e) => e.stopPropagation()}
                      className="touch-target"
                    />
                  </td>
                )}

                {/* Security */}
                <td className="relative py-4 px-4">
                  <div className="flex items-center gap-3">
                    {/* Accent bar */}
                    <div className="w-1 h-12 rounded-full flex-shrink-0 bg-primary/60" />
                    
                    {/* Logo */}
                    <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
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
                    
                    {/* Name & ISIN */}
                    <div className="min-w-0">
                      <p className="font-medium text-primary truncate max-w-[180px]">
                        {holding.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {holding.assetType === 'stock' ? holding.isin : holding.symbol}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Quantity & Holding Period */}
                <td className="relative py-4 px-4 text-right">
                  <div>
                    <p className="font-medium">{formatQuantity(holding.quantity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {holding.holdingPeriodDays} days
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
