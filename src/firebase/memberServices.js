// Datos de cada invitado. Todo vive en /users/{su-email} (lo protegen las reglas)
// salvo el catálogo, que llega filtrado por la función de Netlify `catalog`.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

const userRef = (email, ...path) => doc(db, 'users', email, ...path);
const userCol = (email, ...path) => collection(db, 'users', email, ...path);

// ==================== CATÁLOGO (vía función) ====================
export const getCatalogCountry = async (sector, country) => {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`/.netlify/functions/catalog?sector=${sector}&country=${country}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo leer el catálogo');
  return data.companies;
};

// Conteos por país del catálogo (los mantiene el admin, sin datos de empresas)
export const getCatalogStats = async () => {
  const snap = await getDoc(doc(db, 'stats', 'catalog'));
  return snap.exists() ? snap.data() : {};
};

// El admin guarda los conteos que calcula para que los invitados no tengan que contar
export const saveCatalogStats = (sector, counts) =>
  setDoc(doc(db, 'stats', 'catalog'), { [sector]: counts, updatedAt: serverTimestamp() }, { merge: true });

// ==================== ESTADOS PROPIOS ====================
export const appId = (sector, companyId) => `${sector}_${companyId}`;

export const getApplications = async (email) => {
  const snap = await getDocs(userCol(email, 'applications'));
  return snap.docs.map((d) => d.data());
};

// Guarda estado / notas / ocultas de una empresa, con un resumen para mostrarla
// en el inicio sin volver a leer el catálogo
export const saveApplication = (email, sector, company, fields) =>
  setDoc(
    userRef(email, 'applications', appId(sector, company.id)),
    {
      sector,
      companyId: company.id,
      status: fields.status ?? company.status ?? 'Pending',
      notes: fields.notes ?? company.notes ?? '',
      hidden: fields.hidden ?? company.hidden ?? false,
      name: (company.name || '').slice(0, 300),
      country: (company.country || '').slice(0, 4),
      location: (company.location || '').slice(0, 300),
      email: (company.email || '').slice(0, 300),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

// ==================== PERFIL ====================
export const getProfile = async (email) => {
  const snap = await getDoc(userRef(email));
  return snap.exists() ? snap.data() : null;
};

export const saveProfile = (email, data) =>
  setDoc(userRef(email), { ...data, updatedAt: serverTimestamp() }, { merge: true });

// ==================== TEMPLATES Y ASUNTOS ====================
export const getMemberTemplates = async (email) => {
  const snap = await getDocs(userCol(email, 'templates'));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
};

export const saveMemberTemplate = (email, templateId, content) =>
  setDoc(userRef(email, 'templates', templateId), { content, updatedAt: serverTimestamp() });

export const getMemberSubjects = async (email) => {
  const snap = await getDocs(userCol(email, 'subjects'));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
};

export const createMemberSubject = async (email, { sector, text }) => {
  const ref = doc(userCol(email, 'subjects'));
  const data = { sector, text, createdAt: Timestamp.now() };
  await setDoc(ref, data);
  return { ...data, id: ref.id };
};

export const updateMemberSubject = (email, id, { text, sector, createdAt }) =>
  setDoc(userRef(email, 'subjects', id), { sector, text, createdAt });

export const deleteMemberSubject = (email, id) => deleteDoc(userRef(email, 'subjects', id));

// ==================== PDFs EN PEDAZOS ====================
// Firestore no acepta documentos de más de 1 MB, así que cada PDF se guarda en hasta
// 10 pedazos de texto. El usuario solo ve "Subir CV".
export const MAX_FILE_BYTES = 6 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const CHUNK_CHARS = 900000;

const toBase64 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export const listFiles = async (email) => {
  const snap = await getDocs(userCol(email, 'files'));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
};

// `onProgress(0..1)` para la barra de progreso
export const uploadFile = async (email, file, { kind, sector }, onProgress) => {
  const data = await toBase64(file);
  const parts = [];
  for (let i = 0; i < data.length; i += CHUNK_CHARS) parts.push(data.slice(i, i + CHUNK_CHARS));
  const ref = doc(userCol(email, 'files'));
  // Primero los pedazos y al final el índice: si se corta a la mitad, el archivo no aparece
  try {
    for (let i = 0; i < parts.length; i++) {
      await setDoc(doc(ref, 'chunks', String(i)), { data: parts[i] });
      onProgress?.((i + 1) / (parts.length + 1));
    }
  } catch (err) {
    // Si se cortó, se borran los pedazos que llegaron a subirse
    await Promise.all(parts.map((_, i) => deleteDoc(doc(ref, 'chunks', String(i))).catch(() => {})));
    throw err;
  }
  const meta = {
    name: file.name.slice(0, 200),
    kind,
    sector,
    size: file.size,
    chunks: parts.length,
    contentType: 'application/pdf',
    createdAt: Timestamp.now(),
  };
  await setDoc(ref, meta);
  onProgress?.(1);
  return { ...meta, id: ref.id };
};

export const getFileBase64 = async (email, file) => {
  const parts = await Promise.all(
    Array.from({ length: file.chunks }, (_, i) => getDoc(doc(db, 'users', email, 'files', file.id, 'chunks', String(i))))
  );
  return parts.map((p) => p.data()?.data || '').join('');
};

export const deleteFile = async (email, file) => {
  const batch = writeBatch(db);
  for (let i = 0; i < file.chunks; i++) batch.delete(doc(db, 'users', email, 'files', file.id, 'chunks', String(i)));
  batch.delete(userRef(email, 'files', file.id));
  await batch.commit();
};
