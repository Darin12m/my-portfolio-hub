import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp, waitForAuth } from '@/lib/auth';
import { DecorativeBubbles } from '@/components/DecorativeBubbles';
import { Loader2, TrendingUp, Sparkles } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if already logged in
  useEffect(() => {
    waitForAuth().then((user) => {
      if (user) {
        navigate('/', { replace: true });
      }
      setCheckingAuth(false);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const result = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.error) {
        setError(result.error);
      } else {
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <DecorativeBubbles variant="hero" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative bubbles */}
      <DecorativeBubbles variant="hero" />
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-full flex items-center justify-center glow-primary">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div>
          <span className="text-2xl font-bold font-display">Portfolio</span>
          <span className="text-2xl font-bold text-gradient"> Tracker</span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="glass-strong rounded-3xl p-8 border border-border/30">
          <h1 className="text-xl font-bold font-display text-center mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? 'Sign in to access your portfolio' : 'Start tracking your investments today'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="rounded-xl h-12 bg-secondary/50 border-border/30 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="rounded-xl h-12 bg-secondary/50 border-border/30 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="text-sm text-loss bg-loss/10 rounded-xl p-3 border border-loss/20">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full touch-target rounded-xl h-12 bg-gradient-primary hover:opacity-90 transition-opacity font-semibold" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {isLogin ? (
                <>Don't have an account? <span className="text-primary font-semibold">Sign up</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-semibold">Sign in</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom decorative element */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
