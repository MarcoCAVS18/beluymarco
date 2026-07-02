import { useState, useEffect } from 'react';
import { X, Loader2, Send, Check, AlertCircle } from 'lucide-react';
import { getEmailTemplate } from '../firebase/services';
import { personalizeGreeting, getDefaultSubject } from '../utils/emailUtils';
import { sendEmail } from '../services/gmailService';

// Modal de preview/envío de email para una empresa puntual.
// Autocompleta asunto y cuerpo según el rubro (sector) de la empresa,
// pero ambos quedan editables antes de confirmar el envío.
const EmailSendModal = ({ isOpen, company, sector, onClose }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !company) return;

    let cancelled = false;
    setSendError(null);
    setSent(false);
    setSubject(getDefaultSubject(sector, company.name));
    setBody('');
    setLoadingTemplate(true);

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

    return () => {
      cancelled = true;
    };
  }, [isOpen, company, sector]);

  const handleSend = async () => {
    if (!company?.email) return;
    setSending(true);
    setSendError(null);
    try {
      await sendEmail({ to: company.email, subject, body });
      setSent(true);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-sidebar w-full max-w-lg rounded-2xl border border-dark-hover shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-dark-hover sticky top-0 bg-dark-sidebar">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Send size={18} className="text-accent" />
            Enviar Email
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-surface rounded-full" disabled={sending}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {sendError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              {sendError}
            </div>
          )}

          {/* Para */}
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-1.5">Para</label>
            <input
              type="text"
              value={company.email}
              readOnly
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none text-dark-subtext cursor-not-allowed"
            />
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-1.5">Asunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Cuerpo */}
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-1.5">Cuerpo</label>
            {loadingTemplate ? (
              <div className="flex items-center gap-2 text-dark-subtext text-sm py-4">
                <Loader2 size={16} className="animate-spin" />
                Cargando plantilla...
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors resize-y font-mono"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-dark-hover">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-surface text-dark-text font-medium rounded-full hover:bg-dark-hover transition-colors"
            disabled={sending}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loadingTemplate || !subject.trim() || !body.trim()}
            className="px-4 py-2 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
};

export default EmailSendModal;
