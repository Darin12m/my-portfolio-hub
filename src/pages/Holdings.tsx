import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HoldingsTable } from '@/components/HoldingsTable';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { TradingChart } from '@/components/TradingChart';
import { ImportSheet } from '@/components/ImportSheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Trade, LivePrice, TradeSource } from '@/types/portfolio';
import { mockPrices } from '@/data/mockData';
import { calculateHoldings, calculateGlobalPortfolioTotal } from '@/lib/calculations';
import { startPriceRefresh } from '@/services/priceService';
import { useToast } from '@/hooks/use-toast';
import { fetchTrades, addTrades, deleteTradesBySymbol, deleteTradesBySource, migrateSymbolsToTickers } from '@/services/localDbService';

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Holdings() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const { toast } = useToast();
  const refreshCleanupRef = useRef<(() => void) | null>(null);

  // Load trades from IndexedDB on mount (with migration)
  useEffect(() => {
    const loadTrades = async () => {
      try {
        // First, migrate any existing trades with company names to tickers
        const migrationResult = await migrateSymbolsToTickers();
        if (migrationResult.migrated > 0) {
          console.log(`Migrated ${migrationResult.migrated} trades to proper ticker symbols`);
        }
        
        const localTrades = await fetchTrades();
        setTrades(localTrades);
        console.log('Loaded trades from IndexedDB:', localTrades.length);
      } catch (error) {
        console.error('Error loading trades from IndexedDB:', error);
        toast({
          title: "Database error",
          description: "Could not load trades from local storage.",
          variant: "destructive",
        });
      } finally {
        setDbLoading(false);
      }
    };
    loadTrades();
  }, [toast]);

  // Get all stock symbols
  const symbols = useMemo(() => {
    const stockTrades = trades.filter(t => t.assetType === 'stock');
    return [...new Set(stockTrades.map(t => t.symbol))];
  }, [trades]);

  // Handle price updates
  const handlePriceUpdate = useCallback((newPrices: Map<string, LivePrice>) => {
    setPrices(prev => {
      const updated = new Map(prev);
      newPrices.forEach((price, symbol) => {
        updated.set(symbol, price);
      });
      return updated;
    });
    setLastUpdate(new Date());
    setIsLoading(false);
  }, []);

  // Initialize and start live price refresh
  useEffect(() => {
    // Initial prices from mock data
    const initialPrices = new Map<string, LivePrice>();
    Object.entries(mockPrices).forEach(([symbol, price]) => {
      initialPrices.set(symbol, {
        symbol,
        assetType: 'stock',
        price,
        timestamp: Date.now(),
        source: 'mock',
      });
    });
    setPrices(initialPrices);
    setIsLoading(false);
    setLastUpdate(new Date());
  }, []);

  // Start auto-refresh when symbols change
  useEffect(() => {
    if (symbols.length === 0) return;

    // Cleanup previous refresh
    if (refreshCleanupRef.current) {
      refreshCleanupRef.current();
    }

    // Start new refresh
    refreshCleanupRef.current = startPriceRefresh(
      symbols,
      'stock',
      handlePriceUpdate,
      REFRESH_INTERVAL
    );

    return () => {
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
      }
    };
  }, [symbols, handlePriceUpdate]);

  // Calculate global portfolio total from ALL trades
  const globalPortfolioTotal = useMemo(() => {
    return calculateGlobalPortfolioTotal(trades, prices);
  }, [trades, prices]);

  // Calculate holdings with global total for allocation
  const holdings = useMemo(() => {
    return calculateHoldings(trades, prices, 'stock', globalPortfolioTotal);
  }, [trades, prices, globalPortfolioTotal]);

  // Handle trade imports - with source replacement (no merging)
  const handleImport = async (newTrades: Trade[], source?: TradeSource) => {
    try {
      // If source is provided, delete ALL existing trades from that source first
      if (source) {
        await deleteTradesBySource(source);
        // Update local state to remove those trades
        setTrades(prev => prev.filter(t => t.source !== source));
      }
      
      // Add new trades
      await addTrades(newTrades);
      setTrades(prev => [...prev.filter(t => source ? t.source !== source : true), ...newTrades]);
      
      toast({
        title: "Trades imported",
        description: `${newTrades.length} trades saved locally.`,
      });
    } catch (error) {
      console.error('Error saving trades:', error);
      toast({
        title: "Save failed",
        description: "Could not save trades to local storage.",
        variant: "destructive",
      });
    }
  };

  // Handle delete holdings
  const handleDeleteHoldings = async (symbols: string[]) => {
    try {
      await Promise.all(symbols.map(symbol => deleteTradesBySymbol(symbol)));
      setTrades(prev => prev.filter(t => !symbols.includes(t.symbol)));
      toast({
        title: "Holdings deleted",
        description: `${symbols.length} holding(s) removed.`,
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
      {/* Header - Simplified */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Portfolio</h1>
            
            <div className="flex items-center gap-1">
              <ImportSheet
                trades={trades}
                onImport={handleImport}
              />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-area-bottom">
        {/* Chart and Summary - contained */}
        <div className="container mx-auto px-4 py-5 space-y-5">
          {/* Trading Chart */}
          <TradingChart 
            holdings={holdings} 
            trades={trades}
            isLoading={isLoading}
          />
          
          {/* Live Indicator */}
          {lastUpdate && (
            <div className="flex items-center justify-center gap-1.5 -mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Live · {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Portfolio Summary */}
          <PortfolioSummary holdings={holdings} />
        </div>

        {/* Holdings Table - full width on desktop */}
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