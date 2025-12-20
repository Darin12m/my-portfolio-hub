import { useState } from 'react';
import { AssetType } from '@/types/portfolio';
import { cn } from '@/lib/utils';

interface AssetToggleProps {
  value: AssetType;
  onChange: (value: AssetType) => void;
}

export function AssetToggle({ value, onChange }: AssetToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-secondary/50 p-1">
      <button
        onClick={() => onChange('stock')}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
          value === 'stock'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Stocks
      </button>
      <button
        onClick={() => onChange('crypto')}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
          value === 'crypto'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Crypto
      </button>
    </div>
  );
}
