import { cn } from '@/lib/utils';

interface DecorativeBubblesProps {
  className?: string;
  variant?: 'hero' | 'subtle' | 'minimal';
}

export function DecorativeBubbles({ className, variant = 'subtle' }: DecorativeBubblesProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-float" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-accent/15 to-primary/10 blur-2xl animate-float-slow" />
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-[100px] animate-float" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-accent/25 to-primary/15 blur-[80px] animate-float-slow" />
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full bg-gradient-to-tl from-primary/20 to-transparent blur-[60px] animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Smaller accent bubbles */}
        <div className="absolute top-20 left-1/4 w-20 h-20 rounded-full bg-primary/30 blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 right-20 w-16 h-16 rounded-full bg-accent/25 blur-xl animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full bg-profit/20 blur-lg animate-float" style={{ animationDelay: '4s' }} />
      </div>
    );
  }

  // Subtle variant (default)
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 blur-[80px] animate-float" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-gradient-to-tr from-accent/12 to-primary/8 blur-[60px] animate-float-slow" />
      <div className="absolute top-1/2 right-10 w-24 h-24 rounded-full bg-primary/10 blur-2xl animate-float" style={{ animationDelay: '2s' }} />
    </div>
  );
}
