import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, Check, Wallet, ChevronRight, LogOut, User, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import { useTheme } from '@/hooks/use-theme';

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { theme, setTheme } = useTheme();
  
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

  const themeOptions = [
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm safe-area-top border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="touch-target rounded-lg hover:bg-secondary">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 safe-area-bottom">
        {/* Account Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Account
          </h2>
          
          <GradientCard className="p-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-medium truncate">{user?.email || 'Unknown'}</p>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-border/40">
              <Button 
                variant="outline" 
                className="w-full gap-2 touch-target rounded-lg border-border/60 hover:bg-secondary" 
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </GradientCard>
        </section>

        {/* Appearance Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Appearance
          </h2>
          
          <GradientCard className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
              </div>
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/16 text-primary border border-primary/35"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </GradientCard>
        </section>

        {/* Crypto Accounts Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Crypto Accounts
          </h2>
          
          <Link to="/settings/crypto">
            <GradientCard className="p-4 flex items-center justify-between touch-feedback" glowOnHover>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Exchange Connections</p>
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
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
                    className="flex-1 rounded-lg bg-secondary border-border/40"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditValue(portfolioName);
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSaveName} className="touch-target rounded-lg bg-primary">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio Name</p>
                    <p className="font-medium">{portfolioName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditValue(portfolioName);
                      setIsEditing(true);
                    }}
                    className="touch-target rounded-lg hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Delete Portfolio */}
            <div className="pt-4 border-t border-border/40">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2 touch-target rounded-lg">
                    <Trash2 className="h-4 w-4" />
                    Delete Portfolio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border/60 safe-area-inset">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{portfolioName}" and all {' '}
                      related trades. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="touch-target rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePortfolio}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-target rounded-lg"
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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">P</span>
            </div>
            <span className="font-semibold">Portfolio Tracker</span>
          </div>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </section>
      </main>
    </div>
  );
}
