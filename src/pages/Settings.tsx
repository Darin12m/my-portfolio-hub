import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, Check, Wallet, ChevronRight, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-soft sticky top-0 z-10 safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="touch-target">
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
          
          <div className="card-soft p-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-medium truncate">{user?.email || 'Unknown'}</p>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-border/30">
              <Button 
                variant="outline" 
                className="w-full gap-2 touch-target" 
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </section>

        {/* Crypto Accounts Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Crypto Accounts
          </h2>
          
          <Link to="/settings/crypto">
            <div className="card-soft p-4 flex items-center justify-between hover:shadow-soft-lg transition-shadow cursor-pointer touch-feedback">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Exchange Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Connect Binance, Gate.io and more
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        </section>

        {/* Portfolio Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Portfolio
          </h2>
          
          <div className="card-soft p-4 space-y-4">
            {/* Portfolio Name */}
            <div className="flex items-center justify-between gap-4">
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditValue(portfolioName);
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSaveName} className="touch-target">
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
                    className="touch-target"
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
                  <Button variant="destructive" className="w-full gap-2 touch-target">
                    <Trash2 className="h-4 w-4" />
                    Delete Portfolio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="safe-area-inset">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{portfolioName}" and all {' '}
                      related trades. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="touch-target">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePortfolio}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-target"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
