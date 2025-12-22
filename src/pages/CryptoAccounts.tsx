import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddExchangeModal } from '@/components/AddExchangeModal';
import { ConnectedExchangeCard } from '@/components/ConnectedExchangeCard';
import { useExchangeSync } from '@/hooks/use-exchange-sync';
import { ExchangeType } from '@/services/exchangeApiService';
import { useToast } from '@/hooks/use-toast';

export default function CryptoAccounts() {
  const {
    exchanges,
    isLoading,
    isSyncing,
    error,
    lastSync,
    connect,
    disconnect,
    refresh,
  } = useExchangeSync();
  const { toast } = useToast();

  const handleConnect = async (
    exchange: ExchangeType,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> => {
    const success = await connect(exchange, apiKey, apiSecret);
    
    if (success) {
      toast({
        title: 'Exchange connected',
        description: `Your ${exchange === 'binance' ? 'Binance' : 'Gate.io'} account is now syncing.`,
      });
    } else {
      toast({
        title: 'Connection failed',
        description: error || 'Unable to connect to the exchange.',
        variant: 'destructive',
      });
    }
    
    return success;
  };

  const handleDisconnect = async (exchange: ExchangeType): Promise<boolean> => {
    const success = await disconnect(exchange);
    
    if (success) {
      toast({
        title: 'Exchange disconnected',
        description: `${exchange === 'binance' ? 'Binance' : 'Gate.io'} has been removed.`,
      });
    } else {
      toast({
        title: 'Disconnect failed',
        description: error || 'Unable to disconnect the exchange.',
        variant: 'destructive',
      });
    }
    
    return success;
  };

  const handleRefresh = async () => {
    await refresh();
    toast({
      title: 'Sync complete',
      description: 'Your portfolio has been updated.',
    });
  };

  const connectedExchangeTypes = exchanges.map(e => e.exchange);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="touch-target">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Crypto Accounts</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 safe-area-bottom">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <AddExchangeModal
            onConnect={handleConnect}
            disabledExchanges={connectedExchangeTypes}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isSyncing || isLoading}
            className="gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Last Sync */}
        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleString()}
          </p>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Connected Exchanges */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Connected Exchanges
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : exchanges.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">No exchanges connected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add an exchange to start tracking your crypto portfolio
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exchanges.map((exchange) => (
                <ConnectedExchangeCard
                  key={exchange.exchange}
                  exchange={exchange}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          )}
        </section>

        {/* Info Section */}
        <section className="space-y-4 pt-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Security Information
          </h2>
          
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-medium">Read-only Access</p>
                <p className="text-sm text-muted-foreground">
                  We only request read permissions. Trading and withdrawals are not possible.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔐</span>
              <div>
                <p className="font-medium">Secure Storage</p>
                <p className="text-sm text-muted-foreground">
                  API keys are encrypted and stored securely on our backend servers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔄</span>
              <div>
                <p className="font-medium">Auto Sync</p>
                <p className="text-sm text-muted-foreground">
                  Your portfolio syncs automatically every 5 minutes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
