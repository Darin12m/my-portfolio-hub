import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Trash2, Pencil, Check, Wallet, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
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

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Mock portfolio data - in production this would come from context/state
  const [portfolioName, setPortfolioName] = useState('My Portfolio');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(portfolioName);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 safe-area-top">
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

      <main className="container mx-auto px-4 py-6 space-y-8 safe-area-bottom">
        {/* Theme Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Appearance
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all touch-target',
                    'active:scale-[0.98]',
                    isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Crypto Accounts Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Crypto Accounts
          </h2>
          
          <Link to="/settings/crypto">
            <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer touch-feedback">
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
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Portfolio
          </h2>
          
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
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
            <div className="pt-4 border-t border-border">
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
