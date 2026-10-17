import { useRef, useState } from 'react';
import { FileText, Upload, Trash2, Download, Loader2 } from 'lucide-react';
import { useResources } from '../hooks/useResources';
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '../firebase/memberServices';
import { SECTORS } from '../data/sectors';

const KINDS = { resume: 'CV', cover: 'Cover letter', other: 'Otro documento' };

const prettySize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Descarga un PDF guardado (base64) desde el navegador
const downloadBase64 = (name, base64) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Subir y manejar los PDFs propios (invitados). `sectors`: rubros habilitados.
const DocumentsManager = ({ sectors, defaultKind = 'resume', compact = false }) => {
  const { files, uploadFile, removeFile, fileBase64 } = useResources();
  const input = useRef(null);
  const [kind, setKind] = useState(defaultKind);
  const [sector, setSector] = useState('all');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const used = files.reduce((n, f) => n + (f.size || 0), 0);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return setError('Solo se pueden subir archivos PDF. Si tu CV está en Word o Canva, descargalo como PDF.');
    }
    if (file.size > MAX_FILE_BYTES) {
      return setError(`Este PDF es muy pesado (${prettySize(file.size)}). Probá exportarlo de nuevo eligiendo "tamaño reducido" o "para web".`);
    }
    if (used + file.size > MAX_TOTAL_BYTES) {
      return setError('Ya no te queda espacio para más documentos. Borrá alguno que no uses y probá de nuevo.');
    }
    try {
      setProgress(0);
      await uploadFile(file, { kind, sector }, setProgress);
    } catch (err) {
      console.error('Error subiendo PDF:', err);
      setError('No se pudo subir el archivo. Revisá tu conexión y probá de nuevo.');
    } finally {
      setProgress(null);
    }
  };

  const download = async (f) => {
    try {
      setBusy(f.id);
      downloadBase64(f.name, await fileBase64(f));
    } catch (err) {
      console.error('Error descargando PDF:', err);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (f) => {
    if (!window.confirm(`¿Borrar "${f.name}"?`)) return;
    try {
      setBusy(f.id);
      await removeFile(f);
    } catch (err) {
      console.error('Error borrando PDF:', err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="bg-card rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <span className="w-10 h-10 rounded-xl bg-resources/10 text-resources flex items-center justify-center shrink-0">
                <FileText size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs text-muted">
                  {KINDS[f.kind]} · {f.sector === 'all' ? 'todos los rubros' : SECTORS[f.sector]?.label} · {prettySize(f.size)}
                </div>
              </div>
              {busy === f.id ? (
                <Loader2 size={18} className="animate-spin text-muted" />
              ) : (
                <>
                  <button onClick={() => download(f)} className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted hover:text-ink" aria-label="Descargar">
                    <Download size={16} />
                  </button>
                  <button onClick={() => remove(f)} className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted hover:text-red-600" aria-label="Borrar">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`bg-card rounded-3xl ${compact ? 'p-4' : 'p-5'} shadow-sm space-y-3`}>
        <div className="grid grid-cols-2 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none">
            {Object.entries(KINDS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="all">Para todos los rubros</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                Solo {SECTORS[s].label}
              </option>
            ))}
          </select>
        </div>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={pick} />
        <button
          onClick={() => input.current?.click()}
          disabled={progress !== null}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-line text-sm font-medium text-primary hover:border-primary disabled:opacity-60"
        >
          {progress !== null ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {progress !== null ? `Subiendo... ${Math.round(progress * 100)}%` : `Subir ${KINDS[kind].toLowerCase()} (PDF)`}
        </button>
        {progress !== null && (
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
        <p className="text-xs text-muted">Los CVs se adjuntan solos cuando enviás un email. Usaste {Math.round((used / MAX_TOTAL_BYTES) * 100)}% de tu espacio.</p>
      </div>
    </div>
  );
};

export default DocumentsManager;
