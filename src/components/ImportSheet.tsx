import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ImportModal } from './ImportModal';
import { Trade, TradeSource } from '@/types/portfolio';

interface ImportSheetProps {
  trades: Trade[];
  onImport: (trades: Trade[], source?: TradeSource) => void;
}

export function ImportSheet({ trades, onImport }: ImportSheetProps) {
  const [open, setOpen] = useState(false);

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
        
        <div className="space-y-3 pb-4">
          <ImportModal
            source="trading212"
            existingTrades={trades}
            onImport={(newTrades, source) => {
              onImport(newTrades, source);
              setOpen(false);
            }}
            fullWidth
          />
          <ImportModal
            source="ibkr"
            existingTrades={trades}
            onImport={(newTrades, source) => {
              onImport(newTrades, source);
              setOpen(false);
            }}
            fullWidth
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}