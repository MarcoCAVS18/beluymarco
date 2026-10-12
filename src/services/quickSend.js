// Envío rápido (deslizando la tarjeta): arma el mismo email que el modal de envío
// con los valores por defecto, sin abrir nada.
//  - Cuerpo: template del rubro con el saludo personalizado.
//  - Asunto: el primer asunto guardado del rubro (o el default).
//  - Adjuntos: los CVs del rubro.
// Template, asuntos y PDFs se guardan en memoria la primera vez, así enviar varios
// seguidos no vuelve a leer Firestore ni a bajar los CVs.
import { getEmailTemplate, getSubjects, getResumes } from '../firebase/services';
import { personalizeGreeting, getDefaultSubject } from '../utils/emailUtils';
import { sendEmail } from './gmailService';
import { fetchDocumentAsBase64 } from './documentService';

const templates = {};
let subjectsPromise = null;
const attachmentsBySector = {};

const once = (store, key, load) => {
  if (!store[key]) {
    store[key] = load().catch((err) => {
      delete store[key]; // si falla, el próximo envío reintenta
      throw err;
    });
  }
  return store[key];
};

const loadSubjects = () => {
  if (!subjectsPromise) {
    subjectsPromise = getSubjects().catch((err) => {
      subjectsPromise = null;
      throw err;
    });
  }
  return subjectsPromise;
};

const loadAttachments = (sector) =>
  once(attachmentsBySector, sector, async () => {
    const resumes = (await getResumes()).filter((r) => r.type?.toLowerCase() === sector);
    return Promise.all(
      resumes.map(async (r) => ({ filename: r.file, contentType: 'application/pdf', data: await fetchDocumentAsBase64(r.path) }))
    );
  });

export const quickSendEmail = async (company, sector) => {
  if (!company?.email) throw new Error('La empresa no tiene email');

  const [template, subjects, attachments] = await Promise.all([
    once(templates, sector, () => getEmailTemplate(sector)),
    loadSubjects(),
    loadAttachments(sector),
  ]);
  if (!template?.trim()) throw new Error('No hay template de email para este rubro (cargalo en Recursos)');

  const saved = subjects.find((s) => s.sector === sector);
  const subject = saved ? personalizeGreeting(saved.text, company.name) : getDefaultSubject(sector, company.name);
  const body = personalizeGreeting(template, company.name);

  await sendEmail({ to: company.email, subject, body, attachments: attachments.length ? attachments : undefined });
};

// Si se edita un template o un asunto en Recursos, que el próximo envío use lo nuevo
export const clearQuickSendCache = () => {
  Object.keys(templates).forEach((k) => delete templates[k]);
  subjectsPromise = null;
};
