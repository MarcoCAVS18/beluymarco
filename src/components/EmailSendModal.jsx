import { useState, useEffect } from 'react';
import { Loader2, Send, Check, AlertCircle, Paperclip } from 'lucide-react';
import Sheet from './ui/Sheet';
import { getEmailTemplate, getSubjects, getResumes } from '../firebase/services';
import { personalizeGreeting, getDefaultSubject } from '../utils/emailUtils';
import { sendEmail } from '../services/gmailService';
import { fetchDocumentAsBase64 } from '../services/documentService';

// Modal de preview/envío de email para una empresa puntual.
// Autocompleta asunto y cuerpo según el rubro (sector) de la empresa,
// pero ambos quedan editables antes de confirmar el envío.
// `onSent` se dispara solo si el envío fue exitoso (ej: marcar status "Sent").
const EmailSendModal = ({ isOpen, company, sector, onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [body, setBody] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sent, setSent] = useState(false);
  const [sectorResumes, setSectorResumes] = useState([]);
  const [attachResumes, setAttachResumes] = useState(true);

  useEffect(() => {
    if (!isOpen || !company) return;

    let cancelled = false;
    setSendError(null);
    setSent(false);
    setSubject(getDefaultSubject(sector, company.name));
    setSubjectOptions([]);
    setBody('');
    setLoadingTemplate(true);
    setAttachResumes(true);
    setSectorResumes([]);

    // CVs del rubro (config/app): solo housekeeping y winery tienen resumes.
    getResumes()
      .then((all) => {
        if (cancelled) return;
        setSectorResumes(all.filter((r) => r.type?.toLowerCase() === sector));
      })
      .catch((error) => {
        console.error('Error loading resumes:', error);
      });

    getEmailTemplate(sector)
      .then((content) => {
        if (cancelled) return;
        setBody(personalizeGreeting(content, company.name));
      })
      .catch((error) => {
        console.error('Error loading email template:', error);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplate(false);
      });

    // Subjects guardados del rubro: el primero queda preseleccionado. Si no
    // hay ninguno, queda el default hardcodeado (editable a mano igual).
    getSubjects()
      .then((all) => {
        if (cancelled) return;
        const options = all.filter((s) => s.sector === sector);
        setSubjectOptions(options);
        if (options.length > 0) {
          setSubject(personalizeGreeting(options[0].text, company.name));
        }
      })
      .catch((error) => {
        console.error('Error loading subjects:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, company, sector]);

  const handleSend = async () => {
    if (!company?.email) return;
    setSending(true);
    setSendError(null);
    try {
      let attachments;
      if (attachResumes && sectorResumes.length > 0) {
        attachments = await Promise.all(
          sectorResumes.map(async (resume) => ({
            filename: resume.file,
            contentType: 'application/pdf',
            data: await fetchDocumentAsBase64(resume.path),
          }))
        );
      }
      await sendEmail({ to: company.email, subject, body, attachments });
      setSent(true);
      onSent?.(company);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      setSendError(error.message);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !company) return null;

  return (
    <Sheet
      open
      onClose={sending ? undefined : onClose}
      title={
        <span className="flex items-center gap-2">
          <Send size={18} className="text-primary" />
          Enviar email
        </span>
      }
      subtitle={company.name}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface text-ink text-sm font-medium rounded-2xl hover:bg-line transition-colors"
            disabled={sending}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loadingTemplate || !subject.trim() || !body.trim()}
            className="flex-[2] py-3 bg-primary text-white text-sm font-semibold rounded-2xl hover:bg-primary-strong transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </>
            ) : sent ? (
              <>
                <Check size={16} />
                Enviado
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {sendError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {sendError}
          </div>
        )}

        {/* Para */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Para</label>
          <input
            type="text"
            value={company.email}
            readOnly
            className="w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none text-muted cursor-not-allowed"
          />
        </div>

        {/* Asunto */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Asunto</label>
          {subjectOptions.length > 0 && (() => {
            const selectedId =
              subjectOptions.find((o) => personalizeGreeting(o.text, company.name) === subject)?.id ?? 'custom';
            return (
              <select
                value={selectedId}
                onChange={(e) => {
                  const option = subjectOptions.find((o) => o.id === e.target.value);
                  if (option) setSubject(personalizeGreeting(option.text, company.name));
                }}
                className="w-full px-4 py-2.5 mb-2 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {subjectOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {personalizeGreeting(o.text, company.name)}
                  </option>
                ))}
                {selectedId === 'custom' && <option value="custom">Personalizado</option>}
              </select>
            );
          })()}
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Cuerpo */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Cuerpo</label>
          {loadingTemplate ? (
            <div className="flex items-center gap-2 text-muted text-sm py-4">
              <Loader2 size={16} className="animate-spin" />
              Cargando plantilla...
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary transition-colors resize-y font-mono"
            />
          )}
        </div>

        {/* Adjuntar CVs del rubro (no aplica a kyc, que no tiene resumes) */}
        {sectorResumes.length > 0 && (
          <div className="bg-surface border border-line rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attachResumes}
                onChange={(e) => setAttachResumes(e.target.checked)}
                disabled={sending}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium flex items-center gap-2">
                <Paperclip size={15} className="text-primary" />
                ¿Adjuntamos los currículums?
              </span>
            </label>
            {attachResumes && (
              <ul className="mt-2.5 ml-7 space-y-1">
                {sectorResumes.map((resume) => (
                  <li key={resume.id} className="text-xs text-muted flex items-center gap-1.5">
                    <Check size={12} className="text-primary flex-shrink-0" />
                    {resume.file}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
};

export default EmailSendModal;
