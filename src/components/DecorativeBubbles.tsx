import { cn } from '@/lib/utils';

interface DecorativeBubblesProps {
  className?: string;
  variant?: 'hero' | 'subtle' | 'minimal';
}

export function DecorativeBubbles({ className, variant = 'subtle' }: DecorativeBubblesProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl animate-bubble-glow"
          style={{
            background: 'linear-gradient(135deg, hsl(195 100% 50% / 0.25), hsl(210 100% 60% / 0.15), hsl(180 100% 45% / 0.2))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 6s ease-in-out infinite, gradient-shift 8s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl"
          style={{
            background: 'linear-gradient(225deg, hsl(180 100% 45% / 0.2), hsl(195 100% 50% / 0.15), hsl(210 100% 60% / 0.1))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 8s ease-in-out infinite 1s, gradient-shift 10s ease-in-out infinite 2s',
          }}
        />
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        {/* Large gradient orbs with animated gradients */}
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px]"
          style={{
            background: 'linear-gradient(135deg, hsl(195 100% 50% / 0.35), hsl(210 100% 60% / 0.25), hsl(180 100% 45% / 0.3))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 6s ease-in-out infinite, gradient-shift 12s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute top-1/2 -left-32 w-80 h-80 rounded-full blur-[80px]"
          style={{
            background: 'linear-gradient(225deg, hsl(180 100% 45% / 0.3), hsl(195 100% 50% / 0.2), hsl(210 100% 60% / 0.25))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 8s ease-in-out infinite 2s, gradient-shift 15s ease-in-out infinite 1s',
          }}
        />
        <div 
          className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full blur-[60px]"
          style={{
            background: 'linear-gradient(45deg, hsl(195 100% 50% / 0.25), hsl(180 100% 50% / 0.2), transparent)',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 7s ease-in-out infinite 1s, gradient-shift 10s ease-in-out infinite 3s',
          }}
        />
        
        {/* Smaller accent bubbles */}
        <div 
          className="absolute top-20 left-1/4 w-20 h-20 rounded-full blur-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(195 100% 50% / 0.4), hsl(210 100% 60% / 0.3))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 5s ease-in-out infinite 1s, gradient-shift 6s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-40 right-20 w-16 h-16 rounded-full blur-xl"
          style={{
            background: 'linear-gradient(225deg, hsl(180 100% 45% / 0.35), hsl(195 100% 50% / 0.25))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 6s ease-in-out infinite 3s, gradient-shift 8s ease-in-out infinite 2s',
          }}
        />
        <div 
          className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full blur-lg"
          style={{
            background: 'linear-gradient(135deg, hsl(160 84% 50% / 0.25), hsl(180 100% 45% / 0.2))',
            backgroundSize: '200% 200%',
            animation: 'bubble-glow 4s ease-in-out infinite 4s, gradient-shift 7s ease-in-out infinite 1s',
          }}
        />
      </div>
    );
  }

  // Subtle variant (default)
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div 
        className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px]"
        style={{
          background: 'linear-gradient(135deg, hsl(195 100% 50% / 0.2), hsl(210 100% 60% / 0.15), hsl(180 100% 45% / 0.12))',
          backgroundSize: '200% 200%',
          animation: 'bubble-glow 6s ease-in-out infinite, gradient-shift 10s ease-in-out infinite',
        }}
      />
      <div 
        className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full blur-[60px]"
        style={{
          background: 'linear-gradient(225deg, hsl(180 100% 45% / 0.18), hsl(195 100% 50% / 0.12), hsl(210 100% 60% / 0.1))',
          backgroundSize: '200% 200%',
          animation: 'bubble-glow 8s ease-in-out infinite 1s, gradient-shift 12s ease-in-out infinite 2s',
        }}
      />
      <div 
        className="absolute top-1/2 right-10 w-24 h-24 rounded-full blur-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(195 100% 50% / 0.15), hsl(180 100% 50% / 0.1))',
          backgroundSize: '200% 200%',
          animation: 'bubble-glow 5s ease-in-out infinite 2s, gradient-shift 8s ease-in-out infinite 1s',
        }}
      />
    </div>
  );
}
