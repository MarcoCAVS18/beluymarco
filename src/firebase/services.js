import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
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

// ==================== CONFIG ====================
export const getConfig = async () => {
  const configDoc = await getDoc(doc(db, "config", "app"));
  return configDoc.exists() ? configDoc.data() : null;
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
