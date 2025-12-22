import { useState } from 'react';
import { Trash2, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ConnectedExchange, ExchangeType } from '@/services/exchangeApiService';
import { cn } from '@/lib/utils';

interface ConnectedExchangeCardProps {
  exchange: ConnectedExchange;
  onDisconnect: (exchange: ExchangeType) => Promise<boolean>;
}

const EXCHANGE_NAMES: Record<ExchangeType, string> = {
  binance: 'Binance',
  gateio: 'Gate.io',
};

const EXCHANGE_LOGOS: Record<ExchangeType, string> = {
  binance: '🟡',
  gateio: '🔵',
};

export function ConnectedExchangeCard({ exchange, onDisconnect }: ConnectedExchangeCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(exchange.exchange);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const isError = exchange.status === 'error';

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border bg-card',
        isError ? 'border-destructive/50' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{EXCHANGE_LOGOS[exchange.exchange]}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{EXCHANGE_NAMES[exchange.exchange]}</span>
            {isError ? (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Error</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-profit">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Connected</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>Last sync: {formatLastSync(exchange.lastSync)}</span>
          </div>
          {isError && exchange.error && (
            <p className="text-xs text-destructive mt-1">{exchange.error}</p>
          )}
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {EXCHANGE_NAMES[exchange.exchange]}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection and stop syncing your portfolio from{' '}
              {EXCHANGE_NAMES[exchange.exchange]}. You can reconnect anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
