import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AuthContext, ADMIN_EMAIL } from './authContext';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'member' | 'none'
  const [member, setMember] = useState(null); // invitación: { email, name, sectors, status }
  const [loading, setLoading] = useState(true);
  // Permisos extra de Google (enviar con Gmail, leer métricas): solo en memoria,
  // nunca en el navegador ni en un servidor. Duran ~1 h.
  const tokens = useRef({}); // { scope: { token, exp } }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      tokens.current = {};
      setUser(firebaseUser);
      setMember(null);
      if (!firebaseUser) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const email = (firebaseUser.email || '').toLowerCase();
      if (firebaseUser.emailVerified && email === ADMIN_EMAIL) {
        setRole('admin');
        setLoading(false);
        return;
      }
      try {
        // Las reglas solo dejan leer la invitación propia
        const snap = await getDoc(doc(db, 'members', email));
        const data = snap.exists() ? snap.data() : null;
        setMember(data ? { email, ...data } : null);
        setRole(data?.status === 'active' && firebaseUser.emailVerified ? 'member' : 'none');
      } catch (err) {
        console.error('Error leyendo la invitación:', err);
        setRole('none');
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const signOut = () => firebaseSignOut(auth);

  // Token de Google con un permiso extra. Si no hay uno vigente, lo pide con un popup
  // de Google (un toque) sobre la misma cuenta.
  const getGoogleToken = useCallback(async (scope, { force = false } = {}) => {
    const cached = tokens.current[scope];
    if (!force && cached && cached.exp > Date.now()) return cached.token;
    if (!auth.currentUser) throw new Error('No hay sesión iniciada');
    const provider = new GoogleAuthProvider();
    provider.addScope(scope);
    provider.setCustomParameters({ login_hint: auth.currentUser.email });
    const result = await reauthenticateWithPopup(auth.currentUser, provider);
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
    if (!token) throw new Error('Google no dio el permiso pedido');
    tokens.current[scope] = { token, exp: Date.now() + 55 * 60 * 1000 };
    return token;
  }, []);

  // Para enviar desde el Gmail de la cuenta (invitados)
  const getGmailToken = useCallback((opts) => getGoogleToken(GMAIL_SCOPE, opts), [getGoogleToken]);
  const hasGmail = useCallback(() => (tokens.current[GMAIL_SCOPE]?.exp || 0) > Date.now(), []);

  const isAdmin = role === 'admin';
  const isAuthorized = role === 'admin' || role === 'member';

  return (
    <AuthContext.Provider value={{ user, role, member, isAdmin, isAuthorized, loading, signInWithGoogle, signOut, getGoogleToken, getGmailToken, hasGmail }}>
      {children}
    </AuthContext.Provider>
  );
};
