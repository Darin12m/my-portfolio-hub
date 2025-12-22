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
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';
import { parseFlexibleCSV, parseIBKRCSV, ParseResult } from '@/services/importService';
import { Trade, TradeSource } from '@/types/portfolio';
import { cn } from '@/lib/utils';

type ImportSource = 'trading212' | 'ibkr';

interface ImportModalProps {
  source: ImportSource;
  existingTrades: Trade[];
  onImport: (trades: Trade[], source: TradeSource) => void;
  fullWidth?: boolean;
}

export function ImportModal({ source, existingTrades, onImport, fullWidth }: ImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importedCount, setImportedCount] = useState(0);

  const sourceConfig = {
    trading212: {
      name: 'Trading212',
      description: 'Import your trades from Trading212 CSV export. This will REPLACE all existing Trading212 trades.',
      parser: (content: string) => parseFlexibleCSV(content, 'trading212'),
    },
    ibkr: {
      name: 'Interactive Brokers',
      description: 'Import your trades from IBKR Flex Query CSV export. This will REPLACE all existing IBKR trades.',
      parser: (content: string) => parseIBKRCSV(content),
    },
  };

  const config = sourceConfig[source];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    setFile(file);
    setIsProcessing(true);

    try {
      const content = await file.text();
      const result = config.parser(content);
      setParseResult(result);
      setStep('preview');
    } catch (error) {
      setParseResult({
        trades: [],
        errors: ['Failed to read file'],
        diagnostics: { totalRows: 0, tradesImported: 0, rowsSkipped: 0, skipReasons: {}, warnings: [], totalInvested: 0, uniqueSymbols: [] },
      });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!parseResult) return;
    
    setImportedCount(parseResult.trades.length);
    onImport(parseResult.trades, source);
    setStep('result');
  };

  const resetModal = () => {
    setFile(null);
    setParseResult(null);
    setImportedCount(0);
    setStep('upload');
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetModal, 200);
  };

  // Count existing trades from this source
  const existingSourceTradeCount = existingTrades.filter(t => t.source === source).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", fullWidth && "w-full justify-start")}>
          <Upload className="h-4 w-4" />
          Import from {config.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from {config.name}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border",
              isProcessing && "opacity-50 pointer-events-none"
            )}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing file...</p>
              </div>
            ) : (
              <>
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your CSV file here, or
                </p>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">Browse files</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        )}

        {step === 'preview' && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{file?.name}</span>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total rows:</span>
                  <span className="font-medium">{parseResult.diagnostics.totalRows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades found:</span>
                  <span className="font-semibold text-primary">{parseResult.diagnostics.tradesImported}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique symbols:</span>
                  <span className="font-medium">{parseResult.diagnostics.uniqueSymbols.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total invested:</span>
                  <span className="font-semibold text-primary">${parseResult.diagnostics.totalInvested.toFixed(2)}</span>
                </div>
              </div>

              {parseResult.diagnostics.rowsSkipped > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{parseResult.diagnostics.rowsSkipped} rows skipped</span>
                    {Object.keys(parseResult.diagnostics.skipReasons).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(parseResult.diagnostics.skipReasons).slice(0, 5).map(([reason, count]) => (
                          <li key={reason}>• {reason}: {count as number}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {existingSourceTradeCount > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {existingSourceTradeCount} existing {config.name} trades will be replaced
                  </p>
                </div>
              )}

              {parseResult.trades.length === 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive">
                    <span className="font-medium">No valid trades detected</span>
                    <p className="mt-1 opacity-80">
                      Make sure your CSV contains trade data with columns for Action, Symbol/Ticker, Quantity, and Price.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Trade preview */}
            {parseResult.trades.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Symbol</th>
                      <th className="px-2 py-1 text-left font-medium">Side</th>
                      <th className="px-2 py-1 text-right font-medium">Qty</th>
                      <th className="px-2 py-1 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parseResult.trades.slice(0, 5).map((trade, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1 font-medium">{trade.symbol}</td>
                        <td className={cn("px-2 py-1", trade.side === 'buy' ? 'text-profit' : 'text-loss')}>
                          {trade.side.toUpperCase()}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{trade.quantity.toFixed(8)}</td>
                        <td className="px-2 py-1 text-right">${trade.price.toFixed(4)}</td>
                      </tr>
                    ))}
                    {parseResult.trades.length > 5 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-center text-muted-foreground">
                          ...and {parseResult.trades.length - 5} more trades
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={parseResult.trades.length === 0}>
                Import {parseResult.trades.length} trades
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-profit mb-3" />
              
              <h3 className="font-semibold mb-4">Import Complete</h3>
              
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-2xl font-bold text-profit">{importedCount}</p>
                <p className="text-muted-foreground">Trades imported</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
