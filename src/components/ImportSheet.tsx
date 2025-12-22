import { useState } from 'react';
import { MoreVertical, Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ImportSheetProps {
  onImport: (csvContent: string) => void;
}

export function ImportSheet({ onImport }: ImportSheetProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    const file = e.dataTransfer.files[0];
    if (file?.type === 'text/csv' || file?.name.endsWith('.csv')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const content = await file.text();
      onImport(content);
      setOpen(false);
    } catch (error) {
      console.error('Error reading file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="safe-area-bottom rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Import Trades</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Import your trades from a Trading212 or IBKR CSV export.
          </p>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
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
                    <span className="cursor-pointer gap-2">
                      <Upload className="h-4 w-4" />
                      Browse files
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside pl-2">
              <li>Trading212 CSV export</li>
              <li>Interactive Brokers Flex Query CSV</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
