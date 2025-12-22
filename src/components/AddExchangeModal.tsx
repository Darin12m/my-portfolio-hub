import { useState } from 'react';
import { Plus, Eye, EyeOff, AlertCircle, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExchangeType } from '@/services/exchangeApiService';

interface AddExchangeModalProps {
  onConnect: (exchange: ExchangeType, apiKey: string, apiSecret: string) => Promise<boolean>;
  disabledExchanges?: ExchangeType[];
}

const EXCHANGE_INFO: Record<ExchangeType, { name: string; keyLabel: string; secretLabel: string }> = {
  binance: {
    name: 'Binance',
    keyLabel: 'API Key',
    secretLabel: 'Secret Key',
  },
  gateio: {
    name: 'Gate.io',
    keyLabel: 'API Key',
    secretLabel: 'API Secret',
  },
};

export function AddExchangeModal({ onConnect, disabledExchanges = [] }: AddExchangeModalProps) {
  const [open, setOpen] = useState(false);
  const [exchange, setExchange] = useState<ExchangeType | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setExchange('');
    setApiKey('');
    setApiSecret('');
    setShowSecret(false);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleConnect = async () => {
    if (!exchange || !apiKey.trim() || !apiSecret.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const success = await onConnect(exchange, apiKey.trim(), apiSecret.trim());
      
      if (success) {
        setOpen(false);
        resetForm();
      } else {
        setError('Failed to connect. Please check your API credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const availableExchanges = (['binance', 'gateio'] as ExchangeType[]).filter(
    e => !disabledExchanges.includes(e)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Exchange
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Exchange</DialogTitle>
          <DialogDescription>
            Connect your exchange account to sync your crypto portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Exchange Selector */}
          <div className="space-y-2">
            <Label htmlFor="exchange">Exchange</Label>
            <Select
              value={exchange}
              onValueChange={(value) => setExchange(value as ExchangeType)}
            >
              <SelectTrigger id="exchange">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                {availableExchanges.map((ex) => (
                  <SelectItem key={ex} value={ex}>
                    {EXCHANGE_INFO[ex].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              {exchange ? EXCHANGE_INFO[exchange].keyLabel : 'API Key'}
            </Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">
              {exchange ? EXCHANGE_INFO[exchange].secretLabel : 'API Secret'}
            </Label>
            <div className="relative">
              <Input
                id="apiSecret"
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter your API secret"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Read-only permissions only. Withdrawals must be disabled on your API key
              for security.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!exchange || !apiKey || !apiSecret || isConnecting}
          >
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
      </DialogContent>
    </Dialog>
  );
}
