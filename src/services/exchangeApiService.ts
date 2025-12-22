// Service for communicating with the external backend API for exchange connections
// All sensitive operations (API key storage, signing) happen on the backend

const API_BASE_URL = 'https://api.myportfolioapp.com';

export type ExchangeType = 'binance' | 'gateio';

export interface CryptoHolding {
  symbol: string;
  quantity: number;
  valueUsd: number;
  exchange: string;
  type: 'crypto';
}

export interface ConnectedExchange {
  exchange: ExchangeType;
  status: 'connected' | 'error';
  lastSync: string | null;
  error?: string;
}

export interface ExchangeConnectResponse {
  success: boolean;
  exchange: ExchangeType;
  error?: string;
}

export interface ExchangeSyncResponse {
  success: boolean;
  holdings: CryptoHolding[];
  exchanges: ConnectedExchange[];
  error?: string;
}

export interface ExchangeDisconnectResponse {
  success: boolean;
  exchange: ExchangeType;
  error?: string;
}

// Error messages for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_API_KEY': 'Invalid API key. Please check your credentials.',
  'MISSING_READ_ONLY': 'Read-only permission required. Please create a read-only API key.',
  'RATE_LIMIT': 'Rate limit exceeded. Please try again later.',
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
  'EXCHANGE_UNAVAILABLE': 'Exchange temporarily unavailable. Please try again later.',
  'UNAUTHORIZED': 'Session expired. Please reconnect your exchange.',
};

function getErrorMessage(error: string): string {
  return ERROR_MESSAGES[error] || error || 'An unexpected error occurred.';
}

/**
 * Connect an exchange by sending API credentials to the backend
 * The backend stores the encrypted keys - we never store them locally
 */
export async function connectExchange(
  exchange: ExchangeType,
  apiKey: string,
  apiSecret: string
): Promise<ExchangeConnectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/exchange/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange,
        apiKey,
        apiSecret,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        exchange,
        error: getErrorMessage(errorData.error || 'NETWORK_ERROR'),
      };
    }

    const data = await response.json();
    return {
      success: true,
      exchange,
      ...data,
    };
  } catch (error) {
    console.error('Exchange connect error:', error);
    return {
      success: false,
      exchange,
      error: getErrorMessage('NETWORK_ERROR'),
    };
  }
}

/**
 * Sync holdings from all connected exchanges
 * Returns normalized crypto holdings data
 */
export async function syncExchanges(): Promise<ExchangeSyncResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/exchange/sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        holdings: [],
        exchanges: [],
        error: getErrorMessage(errorData.error || 'NETWORK_ERROR'),
      };
    }

    const data = await response.json();
    return {
      success: true,
      holdings: data.holdings || [],
      exchanges: data.exchanges || [],
    };
  } catch (error) {
    console.error('Exchange sync error:', error);
    return {
      success: false,
      holdings: [],
      exchanges: [],
      error: getErrorMessage('NETWORK_ERROR'),
    };
  }
}

/**
 * Disconnect an exchange - removes API keys from backend
 */
export async function disconnectExchange(
  exchange: ExchangeType
): Promise<ExchangeDisconnectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/exchange/disconnect`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ exchange }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        exchange,
        error: getErrorMessage(errorData.error || 'NETWORK_ERROR'),
      };
    }

    return {
      success: true,
      exchange,
    };
  } catch (error) {
    console.error('Exchange disconnect error:', error);
    return {
      success: false,
      exchange,
      error: getErrorMessage('NETWORK_ERROR'),
    };
  }
}
