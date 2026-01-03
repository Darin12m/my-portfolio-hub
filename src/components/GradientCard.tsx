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
    primary: 'hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)]',
    accent: 'hover:shadow-[0_0_40px_hsl(var(--accent)/0.2)]',
    profit: 'hover:shadow-[0_0_30px_hsl(var(--profit)/0.25)]',
    loss: 'hover:shadow-[0_0_30px_hsl(var(--loss)/0.25)]',
    none: 'hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]',
  };

  const borderClass = {
    primary: 'border-primary/20',
    accent: 'border-accent/20',
    profit: 'border-profit/20',
    loss: 'border-loss/20',
    none: 'border-border/30',
  };

  return (
    <div 
      className={cn(
        "rounded-2xl glass p-4 transition-all duration-300",
        borderClass[gradient],
        glowOnHover && glowClass[gradient],
        className
      )}
    >
      {children}
    </div>
  );
}
