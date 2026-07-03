import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

// ==================== WINERIES ====================
export const getWineries = async () => {
  const wineriesCol = collection(db, "wineries");
  const wineriesSnapshot = await getDocs(query(wineriesCol, orderBy("id")));
  return wineriesSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
};

export const updateWinery = async (id, data) => {
  const wineryRef = doc(db, "wineries", id.toString());
  await updateDoc(wineryRef, data);
};

export const createWinery = async (data) => {
  // Get current max ID
  const wineries = await getWineries();
  const maxId = wineries.reduce((max, w) => Math.max(max, w.id || 0), 0);
  const newId = maxId + 1;

  const newWinery = {
    ...data,
    id: newId,
    createdAt: Timestamp.now(),
  };

  const wineryRef = doc(db, "wineries", newId.toString());
  await setDoc(wineryRef, newWinery);

  return { ...newWinery, docId: newId.toString() };
};

// ==================== HOUSEKEEPING ====================
export const getHousekeeping = async () => {
  const housekeepingCol = collection(db, "housekeeping");
  const housekeepingSnapshot = await getDocs(query(housekeepingCol, orderBy("id")));
  return housekeepingSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
};

export const updateHousekeeping = async (id, data) => {
  const housekeepingRef = doc(db, "housekeeping", id.toString());
  await updateDoc(housekeepingRef, data);
};

export const createHousekeeping = async (data) => {
  // Get current max ID
  const housekeepingList = await getHousekeeping();
  const maxId = housekeepingList.reduce((max, h) => Math.max(max, h.id || 0), 0);
  const newId = maxId + 1;

  const newHousekeeping = {
    ...data,
    id: newId,
    createdAt: Timestamp.now(),
  };

  const housekeepingRef = doc(db, "housekeeping", newId.toString());
  await setDoc(housekeepingRef, newHousekeeping);

  return { ...newHousekeeping, docId: newId.toString() };
};

// ==================== KYC (remoto) ====================
export const getKyc = async () => {
  const kycCol = collection(db, "kyc");
  const kycSnapshot = await getDocs(query(kycCol, orderBy("id")));
  return kycSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
};

export const updateKyc = async (id, data) => {
  const kycRef = doc(db, "kyc", id.toString());
  await updateDoc(kycRef, data);
};

export const createKyc = async (data) => {
  const kycList = await getKyc();
  const maxId = kycList.reduce((max, k) => Math.max(max, k.id || 0), 0);
  const newId = maxId + 1;

  const newKyc = {
    ...data,
    id: newId,
    createdAt: Timestamp.now(),
  };

  const kycRef = doc(db, "kyc", newId.toString());
  await setDoc(kycRef, newKyc);

  return { ...newKyc, docId: newId.toString() };
};

// ==================== TEMPLATES ====================
export const getTemplates = async () => {
  const templatesCol = collection(db, "templates");
  const templatesSnapshot = await getDocs(templatesCol);
  const templates = {};
  templatesSnapshot.docs.forEach(doc => {
    templates[doc.id] = doc.data();
  });
  return templates;
};

export const updateTemplate = async (templateId, content) => {
  const templateRef = doc(db, "templates", templateId);
  await setDoc(templateRef, { content }, { merge: true });
};

// Trae el template de email de un rubro puntual (winery, housekeeping, kyc, etc).
// Se usa para autocompletar el cuerpo del email al enviar a una empresa específica.
export const getEmailTemplate = async (sector) => {
  const templateRef = doc(db, "templates", `${sector}-email`);
  const templateDoc = await getDoc(templateRef);
  return templateDoc.exists() ? (templateDoc.data().content || '') : '';
};

// ==================== CONFIG ====================
export const getConfig = async () => {
  const configDoc = await getDoc(doc(db, "config", "app"));
  return configDoc.exists() ? configDoc.data() : null;
};

export const getCoverLetters = async () => {
  const config = await getConfig();
  return config?.coverLetters || {};
};

export const getFlags = async () => {
  const config = await getConfig();
  return config?.flags || {};
};

export const getStatusOptions = async () => {
  const config = await getConfig();
  return config?.statusOptions || [];
};

export const getResumes = async () => {
  const config = await getConfig();
  return config?.resumes || [];
};

export const getOtherDocuments = async () => {
  const config = await getConfig();
  return config?.otherDocuments || [];
};
