import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { waitForAuth, onAuthChange } from '@/lib/auth';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // First, wait for initial auth state
    waitForAuth().then((initialUser) => {
      setUser(initialUser);
    });

    // Then subscribe to auth changes
    const unsubscribe = onAuthChange((newUser) => {
      setUser(newUser);
    });

    return () => unsubscribe();
  }, []);

  // Still loading
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (user === null) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated
  return <>{children}</>;
}
