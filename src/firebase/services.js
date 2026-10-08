import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  runTransaction,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

// ==================== EMPRESAS (wineries / housekeeping / kyc) ====================
// Las colecciones crecen a miles de documentos, asi que NUNCA se leen enteras:
// se trae por pais (where country == X, sin orderBy para no pedir indice compuesto)
// y se ordena por id en el cliente.
export const getCompaniesByCountry = async (collectionName, countryCode) => {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where("country", "==", countryCode))
  );
  return snapshot.docs
    .map(d => ({ ...d.data(), docId: d.id }))
    .sort((x, y) => (x.id || 0) - (y.id || 0));
};

// Cantidad de empresas por pais con count() del servidor: cuesta ~1 lectura por
// cada 1000 entradas del indice, no una por documento.
export const getCountryCounts = async (collectionName, countryCodes) => {
  const entries = await Promise.all(countryCodes.map(async (code) => {
    const snap = await getCountFromServer(
      query(collection(db, collectionName), where("country", "==", code))
    );
    return [code, snap.data().count];
  }));
  return Object.fromEntries(entries.filter(([, count]) => count > 0));
};

const updateCompany = async (collectionName, id, data) => {
  await updateDoc(doc(db, collectionName, id.toString()), data);
};

// El proximo id sale del documento con id mas alto (1 lectura, no la coleccion
// entera). La escritura es en transaccion y falla si el id ya existe, asi que
// nunca pisa un documento creado por otro lado (por ejemplo un script de carga).
const createCompany = async (collectionName, data) => {
  const top = await getDocs(
    query(collection(db, collectionName), orderBy("id", "desc"), limit(1))
  );
  let newId = (top.docs[0]?.data().id || 0) + 1;

  for (;;) {
    const ref = doc(db, collectionName, newId.toString());
    const payload = { ...data, id: newId, createdAt: Timestamp.now() };
    try {
      await runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) throw new Error("ID_EXISTS");
        tx.set(ref, payload);
      });
      return { ...payload, docId: newId.toString() };
    } catch (err) {
      if (err.message !== "ID_EXISTS") throw err;
      newId += 1;
    }
  }
};

export const updateWinery = (id, data) => updateCompany("wineries", id, data);
export const createWinery = (data) => createCompany("wineries", data);
export const updateHousekeeping = (id, data) => updateCompany("housekeeping", id, data);
export const createHousekeeping = (data) => createCompany("housekeeping", data);
export const updateKyc = (id, data) => updateCompany("kyc", id, data);
export const createKyc = (data) => createCompany("kyc", data);

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

// ==================== SUBJECTS ====================
// Asuntos de email guardados por rubro. El usuario puede tener varios por
// sector y elegir cuál usar al enviar cada email.
export const getSubjects = async () => {
  const subjectsCol = collection(db, "subjects");
  const subjectsSnapshot = await getDocs(query(subjectsCol, orderBy("createdAt")));
  return subjectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const createSubject = async ({ sector, text }) => {
  const subjectRef = doc(collection(db, "subjects"));
  const newSubject = { sector, text, createdAt: Timestamp.now() };
  await setDoc(subjectRef, newSubject);
  return { ...newSubject, id: subjectRef.id };
};

export const updateSubject = async (id, data) => {
  const subjectRef = doc(db, "subjects", id);
  await updateDoc(subjectRef, data);
};

export const deleteSubject = async (id) => {
  const subjectRef = doc(db, "subjects", id);
  await deleteDoc(subjectRef);
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
