import { createContext } from 'react';

export const AuthContext = createContext(null);

// Cuenta admin (la misma que está fija en firestore.rules). Lo que decide de verdad
// quién entra son las reglas de Firestore y la función `catalog`; esto solo elige qué
// pantalla mostrar.
export const ADMIN_EMAIL = 'marcopiermatei1@gmail.com';
