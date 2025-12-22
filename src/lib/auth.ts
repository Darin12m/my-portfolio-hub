import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

let currentUser: User | null = null;
let authInitialized = false;
let authPromise: Promise<User> | null = null;

/**
 * Ensure user is authenticated (anonymous sign-in if needed)
 * Returns the user ID
 */
export async function ensureAuth(): Promise<string> {
  // If we already have a user, return immediately
  if (currentUser) {
    return currentUser.uid;
  }

  // If auth is already being initialized, wait for it
  if (authPromise) {
    const user = await authPromise;
    return user.uid;
  }

  // Start auth initialization
  authPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (user) {
        currentUser = user;
        authInitialized = true;
        resolve(user);
      } else {
        // No user, sign in anonymously
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          authInitialized = true;
          resolve(result.user);
        } catch (error) {
          reject(error);
        }
      }
    });
  });

  const user = await authPromise;
  return user.uid;
}

/**
 * Get current user ID (throws if not authenticated)
 */
export function getCurrentUserId(): string {
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return currentUser.uid;
}

/**
 * Check if auth is ready
 */
export function isAuthReady(): boolean {
  return authInitialized;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}
