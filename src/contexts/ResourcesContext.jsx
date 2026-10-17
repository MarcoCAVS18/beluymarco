import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getTemplates,
  updateTemplate,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getConfig,
} from '../firebase/services';
import {
  getProfile,
  saveProfile as saveProfileDoc,
  getMemberTemplates,
  saveMemberTemplate,
  getMemberSubjects,
  createMemberSubject,
  updateMemberSubject,
  deleteMemberSubject,
  listFiles,
  uploadFile as uploadFileDoc,
  deleteFile as deleteFileDoc,
  getFileBase64,
} from '../firebase/memberServices';
import { fetchDocumentAsBase64 } from '../services/documentService';
import { useAuth } from '../hooks/useAuth';
import { ResourcesContext } from './resourcesContext';

// Lo personal de cada cuenta para escribir y enviar emails: perfil (saludo, firma),
// templates, asuntos y documentos.
//  - Admin: lo de siempre (templates/subjects globales y los CVs de config/app).
//  - Invitado: todo dentro de /users/{su-email}, cargado por él.
const SECTORS = ['winery', 'housekeeping', 'kyc'];
const emptyTemplates = () => Object.fromEntries(SECTORS.map((s) => [s, { email: '', coverLetter: '' }]));

export const ResourcesProvider = ({ children }) => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const email = (user?.email || '').toLowerCase();

  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState(emptyTemplates);
  const [subjects, setSubjects] = useState([]);
  const [files, setFiles] = useState([]); // invitado: PDFs subidos; admin: CVs de config
  const [adminDocs, setAdminDocs] = useState({ otherDocuments: [], coverLetters: {} });
  const [loading, setLoading] = useState(true);
  const base64Cache = useRef(new Map()); // id de archivo -> base64 (para enviar varios seguidos)

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [tpl, subs, cfg] = await Promise.all([getTemplates(), getSubjects(), getConfig()]);
        const next = emptyTemplates();
        for (const s of SECTORS) {
          next[s] = { email: tpl[`${s}-email`]?.content || '', coverLetter: tpl[`${s}-cover-letter`]?.content || '' };
        }
        setTemplates(next);
        setSubjects(subs);
        // CVs del admin: viven en la Netlify Function get-document
        setFiles(
          (cfg?.resumes || []).map((r) => ({ id: `admin-${r.id}`, name: r.file, kind: 'resume', sector: r.type?.toLowerCase(), path: r.path, person: r.person }))
        );
        setAdminDocs({ otherDocuments: cfg?.otherDocuments || [], coverLetters: cfg?.coverLetters || {} });
        setProfile({ displayName: 'Marco y Belu', onboarded: true });
      } else {
        const [prof, tpl, subs, fs] = await Promise.all([getProfile(email), getMemberTemplates(email), getMemberSubjects(email), listFiles(email)]);
        const next = emptyTemplates();
        for (const s of SECTORS) {
          next[s] = { email: tpl[`${s}-email`]?.content || '', coverLetter: tpl[`${s}-cover-letter`]?.content || '' };
        }
        setTemplates(next);
        setSubjects(subs);
        setFiles(fs);
        setProfile(prof || { onboarded: false });
      }
    } catch (err) {
      console.error('Error cargando recursos:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, email]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = useCallback(
    async (data) => {
      if (isAdmin) return;
      const payload = { ...data };
      if (!profile?.createdAt) payload.createdAt = new Date();
      await saveProfileDoc(email, payload);
      setProfile((prev) => ({ ...(prev || {}), ...payload }));
    },
    [isAdmin, email, profile]
  );

  const saveTemplate = useCallback(
    async (sector, type, content) => {
      const id = `${sector}-${type === 'email' ? 'email' : 'cover-letter'}`;
      if (isAdmin) await updateTemplate(id, content);
      else await saveMemberTemplate(email, id, content);
      setTemplates((prev) => ({ ...prev, [sector]: { ...prev[sector], [type]: content } }));
    },
    [isAdmin, email]
  );

  const addSubject = useCallback(
    async (sector, text) => {
      const created = isAdmin ? await createSubject({ sector, text }) : await createMemberSubject(email, { sector, text });
      setSubjects((prev) => [...prev, created]);
      return created;
    },
    [isAdmin, email]
  );

  const editSubject = useCallback(
    async (id, text) => {
      const current = subjects.find((s) => s.id === id);
      if (isAdmin) await updateSubject(id, { text });
      else await updateMemberSubject(email, id, { ...current, text });
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
    },
    [isAdmin, email, subjects]
  );

  const removeSubject = useCallback(
    async (id) => {
      if (isAdmin) await deleteSubject(id);
      else await deleteMemberSubject(email, id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    },
    [isAdmin, email]
  );

  const uploadFile = useCallback(
    async (file, meta, onProgress) => {
      if (isAdmin) throw new Error('Los CVs del admin se manejan aparte');
      const created = await uploadFileDoc(email, file, meta, onProgress);
      setFiles((prev) => [...prev, created]);
      return created;
    },
    [isAdmin, email]
  );

  const removeFile = useCallback(
    async (file) => {
      if (isAdmin) return;
      await deleteFileDoc(email, file);
      base64Cache.current.delete(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    },
    [isAdmin, email]
  );

  // Contenido del archivo en base64 (para adjuntar o descargar)
  const fileBase64 = useCallback(
    async (file) => {
      if (base64Cache.current.has(file.id)) return base64Cache.current.get(file.id);
      const data = isAdmin ? await fetchDocumentAsBase64(file.path) : await getFileBase64(email, file);
      base64Cache.current.set(file.id, data);
      return data;
    },
    [isAdmin, email]
  );

  // CVs que se adjuntan al escribirle a una empresa de este rubro
  const resumesFor = useCallback((sector) => files.filter((f) => f.kind === 'resume' && (f.sector === sector || f.sector === 'all')), [files]);

  const attachmentsFor = useCallback(
    async (sector) =>
      Promise.all(resumesFor(sector).map(async (f) => ({ filename: f.name, contentType: 'application/pdf', data: await fileBase64(f) }))),
    [resumesFor, fileBase64]
  );

  const value = useMemo(
    () => ({
      loading,
      profile,
      saveProfile,
      templates,
      saveTemplate,
      subjects,
      addSubject,
      editSubject,
      removeSubject,
      files,
      uploadFile,
      removeFile,
      fileBase64,
      resumesFor,
      attachmentsFor,
      adminDocs,
      reload: load,
    }),
    [loading, profile, saveProfile, templates, saveTemplate, subjects, addSubject, editSubject, removeSubject, files, uploadFile, removeFile, fileBase64, resumesFor, attachmentsFor, adminDocs, load]
  );

  return <ResourcesContext.Provider value={value}>{children}</ResourcesContext.Provider>;
};
