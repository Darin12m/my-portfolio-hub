import { Trade } from '@/types/portfolio';

const FIREBASE_PROJECT_ID = 'portfoliot-ba1a5';
const FIREBASE_API_KEY = 'AIzaSyBaHfC4ZEUZ5PsfXJ6atZqyf70C6RCe8bE';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface FirestoreDocument {
  name?: string;
  fields: {
    [key: string]: {
      stringValue?: string;
      integerValue?: string;
      doubleValue?: number;
      timestampValue?: string;
    };
  };
}

// Convert Firestore document to Trade
function documentToTrade(doc: FirestoreDocument): Trade {
  const fields = doc.fields;
  const docId = doc.name?.split('/').pop() || '';
  
  return {
    id: fields.id?.stringValue || docId,
    symbol: fields.symbol?.stringValue || '',
    assetType: (fields.assetType?.stringValue as 'stock' | 'crypto') || 'stock',
    side: (fields.side?.stringValue as 'buy' | 'sell') || 'buy',
    quantity: fields.quantity?.doubleValue || parseFloat(fields.quantity?.integerValue || '0'),
    price: fields.price?.doubleValue || parseFloat(fields.price?.integerValue || '0'),
    fee: fields.fee?.doubleValue || parseFloat(fields.fee?.integerValue || '0'),
    date: new Date(fields.date?.timestampValue || Date.now()),
    source: (fields.source?.stringValue as Trade['source']) || 'manual',
  };
}

// Convert Trade to Firestore document fields
function tradeToFields(trade: Trade): FirestoreDocument['fields'] {
  return {
    id: { stringValue: trade.id },
    symbol: { stringValue: trade.symbol },
    assetType: { stringValue: trade.assetType },
    side: { stringValue: trade.side },
    quantity: { doubleValue: trade.quantity },
    price: { doubleValue: trade.price },
    fee: { doubleValue: trade.fee },
    date: { timestampValue: trade.date.toISOString() },
    source: { stringValue: trade.source },
  };
}

// Fetch all trades from Firestore
export async function fetchTrades(): Promise<Trade[]> {
  const response = await fetch(`${FIRESTORE_BASE_URL}/trades?key=${FIREBASE_API_KEY}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Firestore fetch error:', error);
    throw new Error(`Failed to fetch trades: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.documents) {
    return [];
  }
  
  return data.documents.map(documentToTrade);
}

// Add a single trade to Firestore
export async function addTrade(trade: Trade): Promise<void> {
  const response = await fetch(`${FIRESTORE_BASE_URL}/trades?documentId=${trade.id}&key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: tradeToFields(trade) }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Firestore add error:', error);
    throw new Error(`Failed to add trade: ${response.status}`);
  }
}

// Add multiple trades to Firestore
export async function addTrades(trades: Trade[]): Promise<void> {
  await Promise.all(trades.map(trade => addTrade(trade)));
}

// Delete a trade by ID
export async function deleteTrade(tradeId: string): Promise<void> {
  const response = await fetch(`${FIRESTORE_BASE_URL}/trades/${tradeId}?key=${FIREBASE_API_KEY}`, {
    method: 'DELETE',
  });
  
  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error('Firestore delete error:', error);
    throw new Error(`Failed to delete trade: ${response.status}`);
  }
}

// Delete all trades for a symbol
export async function deleteTradesBySymbol(symbol: string): Promise<void> {
  // First fetch all trades to find ones with this symbol
  const trades = await fetchTrades();
  const tradesToDelete = trades.filter(t => t.symbol === symbol);
  
  await Promise.all(tradesToDelete.map(trade => deleteTrade(trade.id)));
}
