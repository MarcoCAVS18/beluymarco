import React, { useState, useEffect } from 'react';
import { Copy, Check, FileDown, Edit3, Save, X, File, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import { useTemplates, useConfig, useSubjects } from '../hooks/useFirebaseData';
import { downloadDocument } from '../services/documentService';
import SectorToggle from './SectorToggle';

const handleDownload = (docPath, filename) => {
  downloadDocument(docPath, filename).catch((error) => {
    console.error('Error descargando documento:', error);
  });
};

const CopyBlock = ({ title, text, onTextChange, downloadPath }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (onTextChange) {
      try {
        setSaving(true);
        await onTextChange(editedText);
        setIsEditing(false);
      } catch (error) {
        console.error('Error guardando template:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  return (
    <div className="bg-card rounded-3xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h4 className="font-medium text-primary">{title}</h4>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-xs font-medium bg-surface hover:bg-line px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white hover:bg-primary-strong px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <>
              {/* Botón PDF solo si existe la ruta */}
              {downloadPath && (
                <button
                  onClick={() => handleDownload(downloadPath, downloadPath.split('/').pop())}
                  className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 border border-primary/20"
                  title="Descargar PDF"
                >
                  <FileText size={14} />
                  PDF
                </button>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-surface hover:bg-line px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                <Edit3 size={14} />
                Editar
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium bg-surface hover:bg-line px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-600 animate-bounce" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copiar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full text-sm text-ink font-mono bg-surface p-4 rounded-2xl border border-primary focus:border-primary outline-none min-h-[200px] resize-y"
          autoFocus
        />
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-muted font-mono bg-surface p-4 rounded-2xl overflow-x-auto">
          {editedText}
        </pre>
      )}
    </div>
  );
};

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
        onChange={(e) => setText(e.target.value)}
        className="flex-1 min-w-0 px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary transition-colors"
      />
      {dirty && (
        <button
          onClick={handleSave}
          disabled={busy || !text.trim()}
          className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-strong transition-colors disabled:opacity-50 shrink-0"
          title="Guardar cambios"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={busy}
        className="p-2.5 bg-surface text-muted rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 shrink-0"
        title="Borrar asunto"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Lista de asuntos del rubro actual + campo para agregar nuevos.
const SubjectsSection = ({ sector }) => {
  const { subjects, loading, addSubject, editSubject, removeSubject } = useSubjects();
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
      <p className="text-sm text-muted mb-4">
        Al enviar un email vas a poder elegir cuál de estos asuntos usar.
      </p>
      <div className="bg-card rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-muted text-sm py-2">
            <Loader2 size={16} className="animate-spin" />
            Cargando asuntos...
          </div>
        ) : (
          <>
            {sectorSubjects.map((subject) => (
              <SubjectRow key={subject.id} subject={subject} onSave={editSubject} onDelete={removeSubject} />
            ))}
            {sectorSubjects.length === 0 && (
              <p className="text-sm text-muted py-1">
                Todavía no hay asuntos para este rubro. Agregá el primero:
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nuevo asunto..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary transition-colors placeholder:text-muted/60"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newText.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-strong transition-colors disabled:opacity-50 shrink-0"
              >
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

const ResourcesView = ({ sector, setSector }) => {
  // Obtenemos coverLetters desde useConfig
  const { templates, loading: templatesLoading, updateTemplate } = useTemplates();
  const { resumes = [], otherDocuments = [], coverLetters = {}, loading: configLoading } = useConfig();

  const loading = templatesLoading || configLoading;

  // Seleccionamos la ruta según el sector
  const currentCoverLetterPath = coverLetters[sector] || '';

  const handleEmailChange = async (newText) => {
    await updateTemplate(sector, 'email', newText);
  };

  const handleCoverLetterChange = async (newText) => {
    await updateTemplate(sector, 'coverLetter', newText);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-4">Recursos</h1>
        <SectorToggle sector={sector} onSectorChange={setSector} />
      </div>

      {/* CVs del rubro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resumes.filter(r => r.type.toLowerCase() === sector).map((resume) => (
          <div key={resume.id} className="bg-card p-4 rounded-2xl flex justify-between items-center group shadow-sm">
            <div>
              <p className="font-semibold">CV de {resume.person}</p>
              <p className="text-xs text-muted uppercase">{resume.type}</p>
            </div>
            <button
              onClick={() => handleDownload(resume.path, resume.file)}
              className="w-11 h-11 flex items-center justify-center bg-primary/10 rounded-xl text-primary transition-colors hover:bg-primary hover:text-white"
              title="Descargar CV"
            >
              <FileDown size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Asuntos */}
      <SubjectsSection sector={sector} />

      {/* Templates */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Cuerpo del email</h3>
        <CopyBlock
          title="Template corto y directo"
          text={templates[sector]?.email || ''}
          onTextChange={handleEmailChange}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Cover letter (en pareja)</h3>
        <CopyBlock
          title="Contenido de la cover letter"
          text={templates[sector]?.coverLetter || ''}
          onTextChange={handleCoverLetterChange}
          downloadPath={currentCoverLetterPath}
        />
      </div>

      {/* Otros documentos */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Otros documentos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherDocuments.map((doc) => (
            <div key={doc.id} className="bg-card p-4 rounded-2xl flex justify-between items-center gap-3 group shadow-sm">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <File size={18} className="text-primary" />
                  {doc.name}
                </p>
                <p className="text-xs text-muted mt-1">{doc.description}</p>
              </div>
              <button
                onClick={() => handleDownload(doc.path, doc.file)}
                className="shrink-0 w-11 h-11 flex items-center justify-center bg-primary/10 rounded-xl text-primary transition-colors hover:bg-primary hover:text-white"
                title={`Descargar ${doc.name}`}
              >
                <FileDown size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ResourcesView;