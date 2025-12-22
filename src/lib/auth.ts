import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';

let currentUser: User | null = null;
let authInitialized = false;
let authInitPromise: Promise<User | null> | null = null;

/**
 * Wait for auth to initialize and return current user
 */
export async function waitForAuth(): Promise<User | null> {
  if (authInitialized) {
    return currentUser;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      currentUser = user;
      authInitialized = true;
      resolve(user);
    });
  });

  return authInitPromise;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    return { error: null };
  } catch (error: any) {
    let message = 'Failed to sign in';
    
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later';
        break;
    }
    
    return { error: message };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ error: string | null }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    return { error: null };
  } catch (error: any) {
    let message = 'Failed to create account';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/operation-not-allowed':
        message = 'Email/password sign up is not enabled';
        break;
    }
    
    return { error: message };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  currentUser = null;
}

/**
 * Get current user (may be null if not authenticated)
 */
export function getCurrentUser(): User | null {
  return currentUser;
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
