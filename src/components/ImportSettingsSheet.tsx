import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ImportModal } from './ImportModal';
import { ExchangeConnection } from './ExchangeConnection';
import { Trade, AssetType, TradeSource } from '@/types/portfolio';

interface ImportSettingsSheetProps {
  assetType: AssetType;
  trades: Trade[];
  onImport: (trades: Trade[], source?: TradeSource) => void;
  binanceConnected: boolean;
  gateioConnected: boolean;
  onBinanceConnect: (apiKey: string, apiSecret: string) => Promise<boolean>;
  onGateioConnect: (apiKey: string, apiSecret: string) => Promise<boolean>;
  onBinanceDisconnect: () => void;
  onGateioDisconnect: () => void;
}

export function ImportSettingsSheet({
  assetType,
  trades,
  onImport,
  binanceConnected,
  gateioConnected,
  onBinanceConnect,
  onGateioConnect,
  onBinanceDisconnect,
  onGateioDisconnect,
}: ImportSettingsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="touch-target">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="safe-area-bottom rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>
            {assetType === 'stock' ? 'Import Trades' : 'Exchange Connections'}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-3 pb-4">
          {assetType === 'stock' ? (
            <>
              <ImportModal
                source="trading212"
                existingTrades={trades}
                onImport={(newTrades, source) => {
                  onImport(newTrades, source);
                  setOpen(false);
                }}
                fullWidth
              />
              <ImportModal
                source="ibkr"
                existingTrades={trades}
                onImport={(newTrades, source) => {
                  onImport(newTrades, source);
                  setOpen(false);
                }}
                fullWidth
              />
            </>
          ) : (
            <>
              <ExchangeConnection
                exchange="binance"
                isConnected={binanceConnected}
                onConnect={onBinanceConnect}
                onDisconnect={onBinanceDisconnect}
                fullWidth
              />
              <ExchangeConnection
                exchange="gateio"
                isConnected={gateioConnected}
                onConnect={onGateioConnect}
                onDisconnect={onGateioDisconnect}
                fullWidth
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
