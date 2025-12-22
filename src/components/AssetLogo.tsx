import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getStockLogoUrl, markLogoFailed, hasLogoFailed } from '@/services/logoService';

interface AssetLogoProps {
  ticker: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AssetLogo({ 
  ticker, 
  name, 
  size = 'md',
  className 
}: AssetLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get initials for fallback
  const getInitials = () => {
    // Use first 2 chars of ticker
    return ticker.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    // Check if logo previously failed
    if (hasLogoFailed(ticker)) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Get logo URL (stocks only)
    const url = getStockLogoUrl(ticker);
    if (url) {
      setLogoUrl(url);
    } else {
      setHasError(true);
    }
    setIsLoading(false);
  }, [ticker]);

  const handleImageError = () => {
    markLogoFailed(ticker);
    setHasError(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div 
      className={cn(
        "rounded-lg bg-muted/50 dark:bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {!hasError && logoUrl ? (
        <>
          {isLoading && (
            <span className={cn("font-bold text-muted-foreground", textSizeClasses[size])}>
              {getInitials()}
            </span>
          )}
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className={cn(
              "object-contain",
              iconSizeClasses[size],
              isLoading && "hidden"
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </>
      ) : (
        <span className={cn("font-bold text-muted-foreground", textSizeClasses[size])}>
          {getInitials()}
        </span>
      )}
    </div>
  );
}
