import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HoldingsTable } from '@/components/HoldingsTable';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { TradingChart } from '@/components/TradingChart';
import { ImportSheet } from '@/components/ImportSheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Trade, LivePrice } from '@/types/portfolio';
import { mockPrices } from '@/data/mockData';
import { calculateHoldings, calculateGlobalPortfolioTotal } from '@/lib/calculations';
import { startPriceRefresh } from '@/services/priceService';
import { useToast } from '@/hooks/use-toast';
import { getTrades, addTrades, deleteTradesByTicker, getExistingTransactionIds } from '@/services/firestoreService';
import { parseCSV, filterDuplicates } from '@/services/importService';

const REFRESH_INTERVAL = 30000;

export default function Holdings() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const { toast } = useToast();
  const refreshCleanupRef = useRef<(() => void) | null>(null);

  // Load trades from Firestore on mount
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const firestoreTrades = await getTrades();
        setTrades(firestoreTrades);
        console.log('Loaded trades from Firestore:', firestoreTrades.length);
      } catch (error) {
        console.error('Error loading trades:', error);
        toast({
          title: "Database error",
          description: "Could not load trades from database.",
          variant: "destructive",
        });
      } finally {
        setDbLoading(false);
      }
    };
    loadTrades();
  }, [toast]);

  // Get all stock tickers
  const tickers = useMemo(() => {
    return [...new Set(trades.map(t => t.ticker))];
  }, [trades]);

  // Handle price updates
  const handlePriceUpdate = useCallback((newPrices: Map<string, LivePrice>) => {
    setPrices(prev => {
      const updated = new Map(prev);
      newPrices.forEach((price, ticker) => {
        updated.set(ticker, price);
      });
      return updated;
    });
    setLastUpdate(new Date());
    setIsLoading(false);
  }, []);

  // Initialize prices
  useEffect(() => {
    const initialPrices = new Map<string, LivePrice>();
    Object.entries(mockPrices).forEach(([ticker, price]) => {
      initialPrices.set(ticker, {
        ticker,
        price,
        timestamp: Date.now(),
        source: 'mock',
      });
    });
    setPrices(initialPrices);
    setIsLoading(false);
    setLastUpdate(new Date());
  }, []);

  // Start auto-refresh when tickers change
  useEffect(() => {
    if (tickers.length === 0) return;

    if (refreshCleanupRef.current) {
      refreshCleanupRef.current();
    }

    refreshCleanupRef.current = startPriceRefresh(
      tickers,
      'stock',
      handlePriceUpdate,
      REFRESH_INTERVAL
    );

    return () => {
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
      }
    };
  }, [tickers, handlePriceUpdate]);

  // Calculate global portfolio total
  const globalPortfolioTotal = useMemo(() => {
    return calculateGlobalPortfolioTotal(trades, prices);
  }, [trades, prices]);

  // Calculate holdings
  const holdings = useMemo(() => {
    return calculateHoldings(trades, prices, globalPortfolioTotal);
  }, [trades, prices, globalPortfolioTotal]);

  // Handle CSV import
  const handleImport = async (csvContent: string) => {
    try {
      const result = parseCSV(csvContent, 'csv');
      
      if (result.errors.length > 0) {
        toast({
          title: "Import warnings",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }

      if (result.trades.length === 0) {
        toast({
          title: "No trades found",
          description: "The CSV file contained no valid trades.",
          variant: "destructive",
        });
        return;
      }

      // Filter duplicates
      const existingIds = await getExistingTransactionIds();
      const newTrades = filterDuplicates(result.trades, existingIds);

      if (newTrades.length === 0) {
        toast({
          title: "No new trades",
          description: "All trades in the file already exist.",
        });
        return;
      }

      // Add to Firestore
      await addTrades(newTrades);
      
      // Reload trades
      const updatedTrades = await getTrades();
      setTrades(updatedTrades);
      
      toast({
        title: "Trades imported",
        description: `${newTrades.length} trades saved. ${result.trades.length - newTrades.length} duplicates skipped.`,
      });
    } catch (error) {
      console.error('Error importing trades:', error);
      toast({
        title: "Import failed",
        description: "Could not import trades.",
        variant: "destructive",
      });
    }
  };

  // Handle delete holdings
  const handleDeleteHoldings = async (tickersToDelete: string[]) => {
    try {
      await Promise.all(tickersToDelete.map(ticker => deleteTradesByTicker(ticker)));
      setTrades(prev => prev.filter(t => !tickersToDelete.includes(t.ticker)));
      toast({
        title: "Holdings deleted",
        description: `${tickersToDelete.length} holding(s) removed.`,
      });
    } catch (error) {
      console.error('Error deleting holdings:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete holdings.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm safe-area-top border-b border-border/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-foreground">P</span>
              </div>
              <h1 className="text-lg font-semibold">Portfolio</h1>
            </div>
            
            <div className="flex items-center gap-1">
              <ImportSheet onImport={handleImport} />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="safe-area-bottom">
        <div className="container mx-auto px-4 py-5 space-y-5">
          <TradingChart 
            holdings={holdings} 
            trades={trades}
            isLoading={isLoading}
          />
          
          {lastUpdate && (
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 live-dot"></span>
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Live · {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          )}

          <PortfolioSummary holdings={holdings} />
        </div>

        <div className="w-full px-4 lg:px-6 xl:px-8 pb-6">
          <HoldingsTable 
            holdings={holdings} 
            isLoading={isLoading || dbLoading}
            onDeleteHoldings={handleDeleteHoldings}
          />
        </div>
      </main>
    </div>
  );
}
