import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  glowOnHover?: boolean;
  gradient?: 'primary' | 'accent' | 'profit' | 'loss' | 'none';
}

export function GradientCard({ 
  children, 
  className, 
  glowOnHover = false,
  gradient = 'none'
}: GradientCardProps) {
  const glowClass = {
    primary: 'hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]',
    accent: 'hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]',
    profit: 'hover:shadow-[0_0_20px_hsl(var(--profit)/0.15)]',
    loss: 'hover:shadow-[0_0_20px_hsl(var(--loss)/0.15)]',
    none: 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.08)]',
  };

  const borderClass = {
    primary: 'border-primary/20 hover:border-primary/30',
    accent: 'border-primary/20 hover:border-primary/30',
    profit: 'border-profit/20 hover:border-profit/30',
    loss: 'border-loss/20 hover:border-loss/30',
    none: 'border-border/60 hover:border-border/80',
  };

  return (
    <div 
      className={cn(
        "rounded-xl bg-card p-4 border transition-all duration-200",
        borderClass[gradient],
        glowOnHover && glowClass[gradient],
        className
      )}
    >
      {children}
    </div>
  );
}
