import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Settings, Layers, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CryptoHoldingsTable } from '@/components/CryptoHoldingsTable';
import { useExchangeSync } from '@/hooks/use-exchange-sync';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function CryptoPortfolio() {
  const {
    holdings,
    exchanges,
    isLoading,
    isSyncing,
    error,
    lastSync,
    refresh,
  } = useExchangeSync();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'combined' | 'per-exchange'>('combined');

  const handleRefresh = async () => {
    await refresh();
    toast({
      title: 'Sync complete',
      description: 'Your crypto portfolio has been updated.',
    });
  };

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  }, [holdings]);

  const connectedCount = exchanges.filter((e) => e.status === 'connected').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="touch-target">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Crypto Portfolio</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isSyncing || isLoading}
                className="touch-target"
              >
                {isSyncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
              </Button>
              <Link to="/settings/crypto">
                <Button variant="ghost" size="icon" className="touch-target">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="safe-area-bottom">
        {/* Summary Cards */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Exchanges</p>
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-xs text-muted-foreground">
                {connectedCount === 1 ? 'connected' : 'connected'}
              </p>
            </div>
          </div>

          {/* Last Sync */}
          {lastSync && (
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-profit animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Last sync: {lastSync.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Holdings
            </h2>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('combined')}
                className={cn(
                  'h-8 px-3 gap-1.5',
                  viewMode === 'combined' && 'bg-background shadow-sm'
                )}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Combined</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('per-exchange')}
                className={cn(
                  'h-8 px-3 gap-1.5',
                  viewMode === 'per-exchange' && 'bg-background shadow-sm'
                )}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Per Exchange</span>
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Holdings Table */}
          <CryptoHoldingsTable
            holdings={holdings}
            isLoading={isLoading}
            viewMode={viewMode}
          />

          {/* No Exchanges Connected */}
          {!isLoading && exchanges.length === 0 && (
            <div className="mt-8 text-center">
              <Link to="/settings/crypto">
                <Button>Connect an Exchange</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
