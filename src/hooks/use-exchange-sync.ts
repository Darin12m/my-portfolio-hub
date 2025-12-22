import { useState, useEffect, useCallback, useRef } from 'react';
import {
  syncExchanges,
  connectExchange,
  disconnectExchange,
  CryptoHolding,
  ConnectedExchange,
  ExchangeType,
} from '@/services/exchangeApiService';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface UseExchangeSyncResult {
  holdings: CryptoHolding[];
  exchanges: ConnectedExchange[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSync: Date | null;
  connect: (exchange: ExchangeType, apiKey: string, apiSecret: string) => Promise<boolean>;
  disconnect: (exchange: ExchangeType) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useExchangeSync(): UseExchangeSyncResult {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [exchanges, setExchanges] = useState<ConnectedExchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performSync = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsSyncing(true);
    }
    setError(null);

    try {
      const result = await syncExchanges();
      
      if (result.success) {
        setHoldings(result.holdings);
        setExchanges(result.exchanges);
        setLastSync(new Date());
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync exchanges');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial sync on mount
  useEffect(() => {
    performSync();
  }, [performSync]);

  // Auto-sync interval
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      performSync(false);
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [performSync]);

  const connect = useCallback(async (
    exchange: ExchangeType,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> => {
    setError(null);
    
    const result = await connectExchange(exchange, apiKey, apiSecret);
    
    if (result.success) {
      // Refresh to get updated holdings
      await performSync();
      return true;
    } else {
      setError(result.error || 'Connection failed');
      return false;
    }
  }, [performSync]);

  const disconnect = useCallback(async (exchange: ExchangeType): Promise<boolean> => {
    setError(null);
    
    const result = await disconnectExchange(exchange);
    
    if (result.success) {
      // Remove holdings from this exchange
      setHoldings(prev => prev.filter(h => h.exchange.toLowerCase() !== exchange));
      setExchanges(prev => prev.filter(e => e.exchange !== exchange));
      return true;
    } else {
      setError(result.error || 'Disconnect failed');
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await performSync(true);
  }, [performSync]);

  return {
    holdings,
    exchanges,
    isLoading,
    isSyncing,
    error,
    lastSync,
    connect,
    disconnect,
    refresh,
  };
}
