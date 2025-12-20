import { useState, useEffect, useMemo, useCallback } from 'react';
import { AssetToggle } from '@/components/AssetToggle';
import { HoldingsTable } from '@/components/HoldingsTable';
import { ImportModal } from '@/components/ImportModal';
import { ExchangeConnection } from '@/components/ExchangeConnection';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';
import { AssetType, Trade, Holding, LivePrice } from '@/types/portfolio';
import { mockTrades, mockPrices } from '@/data/mockData';
import { calculateHoldings } from '@/lib/calculations';
import { fetchPrices } from '@/services/priceService';
import { useToast } from '@/hooks/use-toast';

export default function Holdings() {
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [gateioConnected, setGateioConnected] = useState(false);
  const { toast } = useToast();

  // Get symbols for current asset type
  const symbols = useMemo(() => {
    const filteredTrades = trades.filter(t => t.assetType === assetType);
    return [...new Set(filteredTrades.map(t => t.symbol))];
  }, [trades, assetType]);

  // Initialize prices from mock data
  useEffect(() => {
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

  // Calculate holdings
  const holdings = useMemo(() => {
    return calculateHoldings(trades, prices, assetType);
  }, [trades, prices, assetType]);

  // Refresh prices
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const newPrices = await fetchPrices(symbols, assetType);
      setPrices(prev => {
        const updated = new Map(prev);
        newPrices.forEach((price, symbol) => {
          updated.set(symbol, price);
        });
        return updated;
      });
      setLastUpdate(new Date());
      toast({
        title: "Prices updated",
        description: "Latest market prices have been fetched.",
      });
    } catch (error) {
      toast({
        title: "Failed to refresh prices",
        description: "Using last known prices.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [symbols, assetType, toast]);

  // Handle trade imports
  const handleImport = (newTrades: Trade[]) => {
    setTrades(prev => [...prev, ...newTrades]);
    toast({
      title: "Trades imported",
      description: `${newTrades.length} trades have been added to your portfolio.`,
    });
  };

  // Handle exchange connections
  const handleBinanceConnect = async (apiKey: string, apiSecret: string): Promise<boolean> => {
    // In production, validate API credentials and fetch trades
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBinanceConnected(true);
    toast({
      title: "Binance connected",
      description: "Your Binance account is now syncing.",
    });
    return true;
  };

  const handleGateioConnect = async (apiKey: string, apiSecret: string): Promise<boolean> => {
    // In production, validate API credentials and fetch trades
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Holdings</h1>
            
            <AssetToggle value={assetType} onChange={setAssetType} />
            
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Import/Connect Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {assetType === 'stock' ? (
                <>
                  <ImportModal
                    source="trading212"
                    existingTrades={trades}
                    onImport={handleImport}
                  />
                  <ImportModal
                    source="ibkr"
                    existingTrades={trades}
                    onImport={handleImport}
                  />
                </>
              ) : (
                <>
                  <ExchangeConnection
                    exchange="binance"
                    isConnected={binanceConnected}
                    onConnect={handleBinanceConnect}
                    onDisconnect={() => setBinanceConnected(false)}
                  />
                  <ExchangeConnection
                    exchange="gateio"
                    isConnected={gateioConnected}
                    onConnect={handleGateioConnect}
                    onDisconnect={() => setGateioConnected(false)}
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Portfolio Summary */}
          <PortfolioSummary holdings={holdings} />

          {/* Holdings Table */}
          <HoldingsTable holdings={holdings} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
