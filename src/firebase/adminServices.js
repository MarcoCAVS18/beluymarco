// Solo para la cuenta admin (las reglas rechazan estas operaciones a cualquier otra).
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// ==================== INVITACIONES ====================
export const listMembers = async () => {
  const snap = await getDocs(collection(db, 'members'));
  return snap.docs.map((d) => ({ ...d.data(), email: d.id })).sort((a, b) => (b.invitedAt?.seconds || 0) - (a.invitedAt?.seconds || 0));
};

// El email es el id del documento (en minúsculas): así las reglas lo encuentran directo
export const saveMember = (email, { name, sectors, status = 'active', isNew = false }) =>
  setDoc(
    doc(db, 'members', email.trim().toLowerCase()),
    {
      email: email.trim().toLowerCase(),
      name: (name || '').trim(),
      sectors,
      status,
      ...(isNew ? { invitedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

export const setMemberStatus = (email, status) => updateDoc(doc(db, 'members', email), { status, updatedAt: serverTimestamp() });

export const deleteMember = (email) => deleteDoc(doc(db, 'members', email));

// ==================== CUOTA GRATIS ====================
// Límites gratis diarios de Firestore (plan Spark). Se reinician a la medianoche del Pacífico.
// El uso real se mira en la consola de Firebase: la API de métricas exige facturación.
export const FREE_LIMITS = { reads: 50000, writes: 20000, deletes: 20000 };

// Medianoche de hoy en la hora del Pacífico, en UTC (ahí se reinicia la cuota)
export const pacificMidnight = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const sinceMidnight = ((+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second) * 1000;
  return new Date(now.getTime() - sinceMidnight - now.getMilliseconds());
};
