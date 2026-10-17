import { useState } from 'react';
import { Copy, Check, FileDown, Edit3, Save, X, File, Loader2, FileText, Plus, Trash2, UserRound, Mail } from 'lucide-react';
import { useResources } from '../hooks/useResources';
import { useData } from '../hooks/useFirebaseData';
import { useAuth } from '../hooks/useAuth';
import { downloadDocument } from '../services/documentService';
import SectorToggle from './SectorToggle';
import DocumentsManager from './DocumentsManager';
import ProfileForm from './ProfileForm';
import Sheet from './ui/Sheet';

const handleDownload = (docPath, filename) => {
  downloadDocument(docPath, filename).catch((error) => {
    console.error('Error descargando documento:', error);
  });
};

const CopyBlock = ({ title, hint, text, onTextChange, downloadPath, placeholder }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [saving, setSaving] = useState(false);

  // Si el texto guardado cambia (otro rubro, recarga), se muestra el nuevo
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setEditedText(text);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onTextChange(editedText);
      setIsEditing(false);
    } catch (error) {
      console.error('Error guardando template:', error);
    } finally {
      setSaving(false);
    }
  };

  const empty = !editedText.trim();

  return (
    <div className="bg-card rounded-3xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h4 className="font-medium text-primary">{title}</h4>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <SmallButton onClick={() => { setEditedText(text); setIsEditing(false); }}>
                <X size={14} /> Cancelar
              </SmallButton>
              <SmallButton onClick={handleSave} primary disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </SmallButton>
            </>
          ) : (
            <>
              {downloadPath && (
                <SmallButton onClick={() => handleDownload(downloadPath, downloadPath.split('/').pop())}>
                  <FileText size={14} /> PDF
                </SmallButton>
              )}
              <SmallButton onClick={() => setIsEditing(true)}>
                <Edit3 size={14} /> {empty ? 'Escribir' : 'Editar'}
              </SmallButton>
              {!empty && (
                <SmallButton onClick={handleCopy}>
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </SmallButton>
              )}
            </>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-muted mb-2">{hint}</p>}
      {isEditing ? (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm text-ink font-mono bg-surface p-4 rounded-2xl border border-primary outline-none min-h-[220px] resize-y"
          autoFocus
        />
      ) : empty ? (
        <button onClick={() => setIsEditing(true)} className="w-full text-sm text-muted bg-surface p-6 rounded-2xl border-2 border-dashed border-line">
          Todavía no hay nada acá. Tocá para escribirlo.
        </button>
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-muted font-mono bg-surface p-4 rounded-2xl overflow-x-auto">{editedText}</pre>
      )}
    </div>
  );
};

const SmallButton = ({ onClick, primary, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
      primary ? 'bg-primary text-white hover:bg-primary-strong' : 'bg-surface hover:bg-line'
    }`}
  >
    {children}
  </button>
);

// Fila de un asunto: editable inline, con guardado solo si cambió y borrado.
const SubjectRow = ({ subject, onSave, onDelete }) => {
  const [text, setText] = useState(subject.text);
  const [busy, setBusy] = useState(false);
  const dirty = text !== subject.text;

  const handleSave = async () => {
    if (!dirty || !text.trim()) return;
    try {
      setBusy(true);
      await onSave(subject.id, text.trim());
    } catch (error) {
      console.error('Error guardando asunto:', error);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    try {
      setBusy(true);
      await onDelete(subject.id);
    } catch (error) {
      console.error('Error borrando asunto:', error);
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        maxLength={300}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 min-w-0 px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary"
      />
      {dirty && (
        <button onClick={handleSave} disabled={busy || !text.trim()} className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-50 shrink-0" title="Guardar cambios">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        </button>
      )}
      <button onClick={handleDelete} disabled={busy} className="p-2.5 bg-surface text-muted rounded-xl hover:bg-red-50 hover:text-red-700 disabled:opacity-50 shrink-0" title="Borrar asunto">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Asuntos del rubro actual + campo para agregar nuevos
const SubjectsSection = ({ sector }) => {
  const { subjects, loading, addSubject, editSubject, removeSubject } = useResources();
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const sectorSubjects = subjects.filter((s) => s.sector === sector);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      setAdding(true);
      await addSubject(sector, newText.trim());
      setNewText('');
    } catch (error) {
      console.error('Error agregando asunto:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-1">Asuntos de email</h3>
      <p className="text-sm text-muted mb-4">El primero se usa en el envío rápido; en el modal de envío podés elegir otro.</p>
      <div className="bg-card rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-muted text-sm py-2">
            <Loader2 size={16} className="animate-spin" /> Cargando asuntos...
          </div>
        ) : (
          <>
            {sectorSubjects.map((subject) => (
              <SubjectRow key={subject.id} subject={subject} onSave={editSubject} onDelete={removeSubject} />
            ))}
            {sectorSubjects.length === 0 && <p className="text-sm text-muted py-1">Todavía no hay asuntos para este rubro. Agregá el primero:</p>}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newText}
                maxLength={300}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nuevo asunto..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary placeholder:text-muted/60"
              />
              <button onClick={handleAdd} disabled={adding || !newText.trim()} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl disabled:opacity-50 shrink-0">
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Agregar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TEMPLATE_HINT = 'Podés usar {company} (nombre de la empresa), {nombre}, {firma} y {telefono}: se completan solos al enviar.';

const ResourcesView = ({ sector, setSector }) => {
  const { isAdmin } = useAuth();
  const { sectors } = useData();
  const { loading, templates, saveTemplate, files, adminDocs, profile } = useResources();
  const [profileOpen, setProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const adminResumes = files.filter((f) => f.sector === sector);

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-4">Recursos</h1>
        <SectorToggle sector={sector} onSectorChange={setSector} />
      </div>

      {/* Perfil del invitado (el admin no tiene perfil editable) */}
      {!isAdmin && (
        <button onClick={() => setProfileOpen(true)} className="w-full bg-card rounded-3xl p-4 shadow-sm flex items-center gap-3 text-left">
          <span className="w-11 h-11 rounded-2xl bg-housekeeping/15 text-housekeeping flex items-center justify-center">
            <UserRound size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold truncate">{profile?.displayName || 'Tu perfil'}</span>
            <span className="block text-xs text-muted truncate">{profile?.signature ? profile.signature.split('\n')[0] : 'Nombre, firma y teléfono de tus emails'}</span>
          </span>
          <Edit3 size={16} className="text-muted" />
        </button>
      )}

      {/* Documentos */}
      <div>
        <h3 className="text-xl font-semibold mb-1">Documentos</h3>
        <p className="text-sm text-muted mb-4">{isAdmin ? 'CVs de este rubro.' : 'Tus CVs y documentos. Los CVs del rubro se adjuntan solos al enviar.'}</p>
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminResumes.map((resume) => (
              <div key={resume.id} className="bg-card p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-semibold">CV de {resume.person}</p>
                  <p className="text-xs text-muted">{resume.name}</p>
                </div>
                <button onClick={() => handleDownload(resume.path, resume.name)} className="w-11 h-11 flex items-center justify-center bg-primary/10 rounded-xl text-primary hover:bg-primary hover:text-white" title="Descargar CV">
                  <FileDown size={20} />
                </button>
              </div>
            ))}
            {adminResumes.length === 0 && <p className="text-sm text-muted">No hay CVs para este rubro.</p>}
          </div>
        ) : (
          <DocumentsManager sectors={sectors} />
        )}
      </div>

      <SubjectsSection sector={sector} />

      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail size={20} className="text-primary" /> Cuerpo del email
        </h3>
        <CopyBlock
          title={isAdmin ? 'Template corto y directo' : 'Tu email para este rubro'}
          hint={isAdmin ? null : TEMPLATE_HINT}
          placeholder={'Hi {company} Team,\n\nMy name is {nombre}...\n\n{firma}'}
          text={templates[sector]?.email || ''}
          onTextChange={(t) => saveTemplate(sector, 'email', t)}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Cover letter</h3>
        <CopyBlock
          title="Contenido de la cover letter"
          text={templates[sector]?.coverLetter || ''}
          onTextChange={(t) => saveTemplate(sector, 'coverLetter', t)}
          downloadPath={isAdmin ? adminDocs.coverLetters[sector] : null}
        />
      </div>

      {isAdmin && adminDocs.otherDocuments.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Otros documentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminDocs.otherDocuments.map((doc) => (
              <div key={doc.id} className="bg-card p-4 rounded-2xl flex justify-between items-center gap-3 shadow-sm">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <File size={18} className="text-primary" />
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted mt-1">{doc.description}</p>
                </div>
                <button onClick={() => handleDownload(doc.path, doc.file)} className="shrink-0 w-11 h-11 flex items-center justify-center bg-primary/10 rounded-xl text-primary hover:bg-primary hover:text-white" title={`Descargar ${doc.name}`}>
                  <FileDown size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Tu perfil" subtitle="Se usa en el saludo de la app y en tus emails.">
        <ProfileForm onSaved={() => setProfileOpen(false)} />
      </Sheet>
    </div>
  );
};

export default ResourcesView;
