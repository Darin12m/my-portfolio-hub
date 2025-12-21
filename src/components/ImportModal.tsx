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
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { parseTrading212CSV, parseIBKRCSV } from '@/services/importService';
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
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importedCount, setImportedCount] = useState(0);

  const sourceConfig = {
    trading212: {
      name: 'Trading212',
      description: 'Import your trades from Trading212 CSV export. This will REPLACE all existing Trading212 trades.',
      parser: parseTrading212CSV,
    },
    ibkr: {
      name: 'Interactive Brokers',
      description: 'Import your trades from IBKR Flex Query CSV export. This will REPLACE all existing IBKR trades.',
      parser: parseIBKRCSV,
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
      const { trades, errors } = config.parser(content);
      
      setParsedTrades(trades);
      setParseErrors(errors);
      setStep('preview');
    } catch (error) {
      setParseErrors(['Failed to read file']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    // Pass ALL parsed trades and the source - no duplicate checking here
    // The parent will delete all existing trades from this source first
    setImportedCount(parsedTrades.length);
    onImport(parsedTrades, source);
    setStep('result');
  };

  const resetModal = () => {
    setFile(null);
    setParsedTrades([]);
    setParseErrors([]);
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
                <p className="text-sm text-muted-foreground">Processing file...</p>
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

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{file?.name}</span>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Trades found</span>
                <span className="text-sm text-primary font-semibold">{parsedTrades.length}</span>
              </div>
              
              {existingSourceTradeCount > 0 && (
                <div className="flex items-start gap-2 mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {existingSourceTradeCount} existing {config.name} trades will be replaced
                  </p>
                </div>
              )}
              
              {parseErrors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Notes ({parseErrors.length})</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto">
                    {parseErrors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li>...and {parseErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={parsedTrades.length === 0}>
                Import {parsedTrades.length} trades
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
