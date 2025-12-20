import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Exchange = 'binance' | 'gateio';

interface ExchangeConnectionProps {
  exchange: Exchange;
  isConnected: boolean;
  onConnect: (apiKey: string, apiSecret: string) => Promise<boolean>;
  onDisconnect: () => void;
}

export function ExchangeConnection({ 
  exchange, 
  isConnected, 
  onConnect, 
  onDisconnect 
}: ExchangeConnectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const exchangeConfig = {
    binance: {
      name: 'Binance',
      description: 'Connect your Binance account to sync spot trades',
      apiKeyLabel: 'API Key',
      secretLabel: 'Secret Key',
      instructions: 'Create a read-only API key in your Binance account settings. Enable "Can Read" permission only.',
    },
    gateio: {
      name: 'Gate.io',
      description: 'Connect your Gate.io account to sync spot trades',
      apiKeyLabel: 'API Key',
      secretLabel: 'API Secret',
      instructions: 'Create a read-only API key in your Gate.io API management. Enable spot trading read permission only.',
    },
  };

  const config = exchangeConfig[exchange];

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Both API Key and Secret are required');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const result = await onConnect(apiKey, apiSecret);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          resetForm();
        }, 1500);
      } else {
        setError('Failed to connect. Please check your API credentials.');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    setIsOpen(false);
  };

  const resetForm = () => {
    setApiKey('');
    setApiSecret('');
    setShowSecret(false);
    setError('');
    setSuccess(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant={isConnected ? "secondary" : "outline"} 
          size="sm" 
          className={cn("gap-2", isConnected && "border-profit/30 text-profit")}
        >
          {isConnected ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {config.name} Connected
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Connect {config.name}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isConnected ? `Manage ${config.name} Connection` : `Connect ${config.name}`}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-profit/30 bg-profit/5 p-4">
              <div className="flex items-center gap-2 text-profit">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Connected</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Your {config.name} account is connected and syncing trades.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : success ? (
          <div className="rounded-lg border border-profit/30 bg-profit/5 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-profit mb-3" />
            <h3 className="font-semibold text-profit">Connected Successfully!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Syncing your trades...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {config.instructions}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="apiKey">{config.apiKeyLabel}</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret">{config.secretLabel}</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="apiSecret"
                    type={showSecret ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-loss flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
