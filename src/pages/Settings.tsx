import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, Check, Wallet, ChevronRight, LogOut, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DecorativeBubbles } from '@/components/DecorativeBubbles';
import { GradientCard } from '@/components/GradientCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, signOut } from '@/lib/auth';

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  // Mock portfolio data - in production this would come from context/state
  const [portfolioName, setPortfolioName] = useState('My Portfolio');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(portfolioName);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSaveName = () => {
    if (editValue.trim()) {
      setPortfolioName(editValue.trim());
      setIsEditing(false);
      toast({
        title: 'Portfolio renamed',
        description: `Portfolio is now called "${editValue.trim()}"`,
      });
    }
  };

  const handleDeletePortfolio = () => {
    toast({
      title: 'Portfolio deleted',
      description: 'All trades have been removed.',
      variant: 'destructive',
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative bubbles */}
      <DecorativeBubbles variant="subtle" className="fixed" />
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-20 safe-area-top border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="touch-target rounded-xl hover:bg-primary/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold font-display">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 safe-area-bottom relative z-10">
        {/* Account Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Account
          </h2>
          
          <GradientCard className="p-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-semibold truncate">{user?.email || 'Unknown'}</p>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-border/30">
              <Button 
                variant="outline" 
                className="w-full gap-2 touch-target rounded-xl border-border/50 hover:bg-primary/10" 
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </GradientCard>
        </section>

        {/* Crypto Accounts Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Crypto Accounts
          </h2>
          
          <Link to="/settings/crypto">
            <GradientCard className="p-4 flex items-center justify-between touch-feedback" glowOnHover>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Exchange Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Connect Binance, Gate.io and more
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </GradientCard>
          </Link>
        </section>

        {/* Portfolio Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Portfolio
          </h2>
          
          <GradientCard className="p-4 space-y-4">
            {/* Portfolio Name */}
            <div className="flex items-center justify-between gap-4">
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-xl bg-secondary/50 border-border/30"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditValue(portfolioName);
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSaveName} className="touch-target rounded-xl bg-gradient-primary">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio Name</p>
                    <p className="font-semibold">{portfolioName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditValue(portfolioName);
                      setIsEditing(true);
                    }}
                    className="touch-target rounded-xl hover:bg-primary/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Delete Portfolio */}
            <div className="pt-4 border-t border-border/30">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2 touch-target rounded-xl">
                    <Trash2 className="h-4 w-4" />
                    Delete Portfolio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-strong border-border/30 safe-area-inset">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display">Delete Portfolio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{portfolioName}" and all {' '}
                      related trades. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="touch-target rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePortfolio}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-target rounded-xl"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </GradientCard>
        </section>

        {/* App Info */}
        <section className="pt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-full flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold font-display text-gradient">Portfolio Tracker</span>
          </div>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </section>
      </main>
    </div>
  );
}
