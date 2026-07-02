import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthContext } from './authContext';

// Único email habilitado para usar la app (uso personal, un solo usuario).
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || 'marcopiermatei1@gmail.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const isAuthorized = user?.email === ALLOWED_EMAIL;

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthorized, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
