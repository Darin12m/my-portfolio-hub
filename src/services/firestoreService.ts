import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, AssetType, TradeSide, TradeSource } from "@/types/portfolio";

const TRADES_COLLECTION = "trades";

// Convert Firestore document to Trade
function docToTrade(doc: any): Trade {
  const data = doc.data();
  return {
    id: doc.id,
    symbol: data.symbol,
    assetType: data.assetType as AssetType,
    side: data.side as TradeSide,
    quantity: data.quantity,
    price: data.price,
    fee: data.fee || 0,
    date: data.date?.toDate() || new Date(),
    source: data.source as TradeSource,
  };
}

// Convert Trade to Firestore document
function tradeToDoc(trade: Trade): Record<string, any> {
  return {
    symbol: trade.symbol,
    assetType: trade.assetType,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fee: trade.fee,
    date: Timestamp.fromDate(new Date(trade.date)),
    source: trade.source,
  };
}

// Fetch all trades
export async function fetchTrades(): Promise<Trade[]> {
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(tradesRef, orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTrade);
}

// Fetch trades by asset type
export async function fetchTradesByAssetType(assetType: AssetType): Promise<Trade[]> {
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(
    tradesRef, 
    where("assetType", "==", assetType),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTrade);
}

// Add a single trade
export async function addTrade(trade: Omit<Trade, "id">): Promise<string> {
  const tradesRef = collection(db, TRADES_COLLECTION);
  const docRef = await addDoc(tradesRef, tradeToDoc(trade as Trade));
  return docRef.id;
}

// Add multiple trades (batch)
export async function addTrades(trades: Omit<Trade, "id">[]): Promise<void> {
  const batch = writeBatch(db);
  const tradesRef = collection(db, TRADES_COLLECTION);
  
  trades.forEach((trade) => {
    const docRef = doc(tradesRef);
    batch.set(docRef, tradeToDoc(trade as Trade));
  });
  
  await batch.commit();
}

// Update a trade
export async function updateTrade(id: string, updates: Partial<Trade>): Promise<void> {
  const tradeRef = doc(db, TRADES_COLLECTION, id);
  const updateData: Record<string, any> = { ...updates };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(new Date(updates.date));
  }
  
  await updateDoc(tradeRef, updateData);
}

// Delete a trade
export async function deleteTrade(id: string): Promise<void> {
  const tradeRef = doc(db, TRADES_COLLECTION, id);
  await deleteDoc(tradeRef);
}

// Delete trades by symbol
export async function deleteTradesBySymbol(symbol: string): Promise<void> {
  const tradesRef = collection(db, TRADES_COLLECTION);
  const q = query(tradesRef, where("symbol", "==", symbol));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}
