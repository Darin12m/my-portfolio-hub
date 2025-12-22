import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureAuth } from '@/lib/auth';
import type { Trade, TradeSource } from '@/types/portfolio';

const TRADES_COLLECTION = 'trades';

// Firestore document type (with Timestamp)
interface FirestoreTradeDoc {
  id: string;
  userId: string;
  brokerTransactionId: string;
  action: 'BUY' | 'SELL';
  timestamp: string;
  isin: string;
  ticker: string;
  name: string;
  shares: number;
  pricePerShare: number;
  priceCurrency: string;
  totalValue: number;
  totalCurrency: string;
  exchangeRate: number;
  source: TradeSource;
  createdAt: Timestamp | null;
}

/**
 * Convert Firestore document to Trade object
 */
function firestoreToTrade(doc: FirestoreTradeDoc): Trade {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Timestamp 
      ? doc.createdAt.toDate() 
      : null,
  };
}

/**
 * Get all trades for the current user
 */
export async function getTrades(): Promise<Trade[]> {
  const userId = await ensureAuth();
  
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(tradesRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  const trades: Trade[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as FirestoreTradeDoc;
    trades.push(firestoreToTrade({ ...data, id: docSnap.id }));
  });
  
  // Sort by timestamp descending
  trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return trades;
}

/**
 * Add multiple trades to Firestore (batch write)
 */
export async function addTrades(trades: Omit<Trade, 'id' | 'userId' | 'createdAt'>[]): Promise<void> {
  if (trades.length === 0) return;
  
  const userId = await ensureAuth();
  const batch = writeBatch(db);
  
  for (const trade of trades) {
    const docRef = doc(collection(db, TRADES_COLLECTION));
    batch.set(docRef, {
      ...trade,
      id: docRef.id,
      userId,
      createdAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
}

/**
 * Check if a trade with given brokerTransactionId already exists
 */
export async function tradeExists(brokerTransactionId: string): Promise<boolean> {
  const userId = await ensureAuth();
  
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(
    tradesRef,
    where('userId', '==', userId),
    where('brokerTransactionId', '==', brokerTransactionId)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get existing broker transaction IDs for duplicate detection
 */
export async function getExistingTransactionIds(): Promise<Set<string>> {
  const trades = await getTrades();
  return new Set(trades.map(t => t.brokerTransactionId));
}

/**
 * Delete a single trade by ID
 */
export async function deleteTrade(tradeId: string): Promise<void> {
  await ensureAuth();
  const docRef = doc(db, TRADES_COLLECTION, tradeId);
  await deleteDoc(docRef);
}

/**
 * Delete all trades for a given ticker
 */
export async function deleteTradesByTicker(ticker: string): Promise<void> {
  const userId = await ensureAuth();
  
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(
    tradesRef,
    where('userId', '==', userId),
    where('ticker', '==', ticker)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

/**
 * Delete all trades from a given source
 */
export async function deleteTradesBySource(source: TradeSource): Promise<void> {
  const userId = await ensureAuth();
  
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(
    tradesRef,
    where('userId', '==', userId),
    where('source', '==', source)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

/**
 * Update a trade
 */
export async function updateTrade(
  tradeId: string, 
  updates: Partial<Omit<Trade, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await ensureAuth();
  const docRef = doc(db, TRADES_COLLECTION, tradeId);
  await updateDoc(docRef, updates);
}

/**
 * Clear all trades for current user
 */
export async function clearAllTrades(): Promise<void> {
  const userId = await ensureAuth();
  
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(tradesRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}
