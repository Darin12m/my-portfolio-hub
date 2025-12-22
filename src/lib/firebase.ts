import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBaHfC4ZEUZ5PsfXJ6atZqyf70C6RCe8bE",
  authDomain: "portfoliot-ba1a5.firebaseapp.com",
  projectId: "portfoliot-ba1a5",
  storageBucket: "portfoliot-ba1a5.firebasestorage.app",
  messagingSenderId: "952692647546",
  appId: "1:952692647546:web:77af119648f65b1990fdc3",
  measurementId: "G-9FJR4ZHFKL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth with local persistence (survives page refresh)
export const auth = getAuth(app);

// Set persistence to LOCAL to keep user logged in across sessions
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

export default app;
