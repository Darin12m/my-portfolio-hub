import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AssetToggle } from '@/components/AssetToggle';
import { HoldingsTable } from '@/components/HoldingsTable';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { TradingChart } from '@/components/TradingChart';
import { ImportSettingsSheet } from '@/components/ImportSettingsSheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { AssetType, Trade, LivePrice, TradeSource } from '@/types/portfolio';
import { mockPrices } from '@/data/mockData';
import { calculateHoldings, calculateGlobalPortfolioTotal } from '@/lib/calculations';
import { startPriceRefresh } from '@/services/priceService';
import { useToast } from '@/hooks/use-toast';
import { fetchTrades, addTrades, deleteTradesBySymbol, deleteTradesBySource } from '@/services/localDbService';

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Holdings() {
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [gateioConnected, setGateioConnected] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const { toast } = useToast();
  const refreshCleanupRef = useRef<(() => void) | null>(null);

  // Load trades from IndexedDB on mount
  useEffect(() => {
    const loadTrades = async () => {
      try {
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

  // Get symbols for current asset type
  const symbols = useMemo(() => {
    const filteredTrades = trades.filter(t => t.assetType === assetType);
    return [...new Set(filteredTrades.map(t => t.symbol))];
  }, [trades, assetType]);

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
        assetType: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX'].includes(symbol) ? 'crypto' : 'stock',
        price,
        timestamp: Date.now(),
        source: 'mock',
      });
    });
    setPrices(initialPrices);
    setIsLoading(false);
    setLastUpdate(new Date());
  }, []);

  // Start auto-refresh when symbols or asset type changes
  useEffect(() => {
    if (symbols.length === 0) return;

    // Cleanup previous refresh
    if (refreshCleanupRef.current) {
      refreshCleanupRef.current();
    }

    // Start new refresh
    refreshCleanupRef.current = startPriceRefresh(
      symbols,
      assetType,
      handlePriceUpdate,
      REFRESH_INTERVAL
    );

    return () => {
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
      }
    };
  }, [symbols, assetType, handlePriceUpdate]);

  // Calculate global portfolio total from ALL trades (not filtered by asset type)
  const globalPortfolioTotal = useMemo(() => {
    return calculateGlobalPortfolioTotal(trades, prices);
  }, [trades, prices]);

  // Calculate holdings with global total for allocation
  const holdings = useMemo(() => {
    return calculateHoldings(trades, prices, assetType, globalPortfolioTotal);
  }, [trades, prices, assetType, globalPortfolioTotal]);

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

  // Handle exchange connections
  const handleBinanceConnect = async (apiKey: string, apiSecret: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBinanceConnected(true);
    toast({
      title: "Binance connected",
      description: "Your Binance account is now syncing.",
    });
    return true;
  };

  const handleGateioConnect = async (apiKey: string, apiSecret: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setGateioConnected(true);
    toast({
      title: "Gate.io connected",
      description: "Your Gate.io account is now syncing.",
    });
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Holdings</h1>
            
            <AssetToggle value={assetType} onChange={setAssetType} />
            
            <div className="flex items-center gap-1">
              <ImportSettingsSheet
                assetType={assetType}
                trades={trades}
                onImport={handleImport}
                binanceConnected={binanceConnected}
                gateioConnected={gateioConnected}
                onBinanceConnect={handleBinanceConnect}
                onGateioConnect={handleGateioConnect}
                onBinanceDisconnect={() => setBinanceConnected(false)}
                onGateioDisconnect={() => setGateioConnected(false)}
              />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="touch-target">
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
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Trading Chart */}
          <TradingChart 
            holdings={holdings} 
            trades={trades}
            isLoading={isLoading}
          />
          
          {/* Live Indicator */}
          {lastUpdate && (
            <div className="flex items-center justify-center gap-1.5 -mt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-profit animate-pulse" />
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
