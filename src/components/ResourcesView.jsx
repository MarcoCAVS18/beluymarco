import React, { useState, useEffect } from 'react';
import { Copy, Check, FileDown, Edit3, Save, X, File, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import { useTemplates, useConfig, useSubjects } from '../hooks/useFirebaseData';
import SectorToggle from './SectorToggle';

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
        console.error('Error saving template:', error);
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
    <div className="bg-dark-sidebar border border-dark-hover rounded-2xl p-5 mb-6 hover:border-accent/50 transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-accent">{title}</h4>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-xs font-medium bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium bg-accent text-black hover:bg-accent/90 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              {/* Botón PDF solo si existe la ruta */}
              {downloadPath && (
                <a
                  href={downloadPath}
                  download
                  className="flex items-center gap-1.5 text-xs font-medium bg-purple-900/40 text-purple-200 hover:bg-purple-900/60 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 border border-purple-500/30"
                  title="Download PDF Version"
                >
                  <FileText size={14} />
                  PDF
                </a>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-400 animate-bounce" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
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
          className="w-full text-sm text-dark-text font-mono bg-dark-bg p-4 rounded-xl border border-accent focus:border-accent outline-none min-h-[200px] resize-y"
          autoFocus
        />
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-dark-subtext font-mono bg-dark-bg p-4 rounded-xl overflow-x-auto border border-dark-hover/50">
          {editedText}
        </pre>
      )}
    </div>
  );
};

// Fila de un subject: editable inline, con guardado solo si cambió y borrado.
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
      console.error('Error saving subject:', error);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    try {
      setBusy(true);
      await onDelete(subject.id);
    } catch (error) {
      console.error('Error deleting subject:', error);
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 min-w-0 px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors"
      />
      {dirty && (
        <button
          onClick={handleSave}
          disabled={busy || !text.trim()}
          className="p-2.5 bg-accent text-black rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 shrink-0"
          title="Guardar cambios"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={busy}
        className="p-2.5 bg-dark-surface text-dark-subtext rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50 shrink-0"
        title="Borrar subject"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Lista de subjects del rubro actual + campo para agregar nuevos.
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
      console.error('Error adding subject:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-1">Email Subjects</h3>
      <p className="text-sm text-dark-subtext mb-4">
        Al enviar un email vas a poder elegir cuál de estos asuntos usar.
      </p>
      <div className="bg-dark-sidebar border border-dark-hover rounded-2xl p-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-dark-subtext text-sm py-2">
            <Loader2 size={16} className="animate-spin" />
            Cargando subjects...
          </div>
        ) : (
          <>
            {sectorSubjects.map((subject) => (
              <SubjectRow key={subject.id} subject={subject} onSave={editSubject} onDelete={removeSubject} />
            ))}
            {sectorSubjects.length === 0 && (
              <p className="text-sm text-dark-subtext py-1">
                Todavía no hay subjects para este rubro. Agregá el primero:
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nuevo subject..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-dark-bg border border-dark-hover rounded-xl text-sm outline-none focus:border-accent transition-colors placeholder:text-dark-subtext/60"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newText.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-black text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 shrink-0"
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ResourcesView = () => {
  const [sector, setSector] = useState('winery');
  
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
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Toggles */}
      <div className="mb-8">
        <SectorToggle sector={sector} onSectorChange={setSector} showAddButton={false} />
      </div>

      {/* Download Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resumes.filter(r => r.type.toLowerCase() === sector).map((resume) => (
          <div key={resume.id} className="bg-dark-surface border border-dark-hover p-4 rounded-xl flex justify-between items-center group hover:border-accent transition-all duration-200 hover:shadow-lg hover:shadow-accent/10">
            <div>
              <p className="font-semibold">{resume.person}'s Resume</p>
              <p className="text-xs text-dark-subtext uppercase">{resume.type}</p>
            </div>
            <a
              href={resume.path}
              download={resume.file}
              className="p-2 bg-dark-bg rounded-full text-dark-text group-hover:text-accent transition-all duration-200 hover:scale-110"
              title="Download resume"
            >
              <FileDown size={20} className="group-hover:animate-bounce" />
            </a>
          </div>
        ))}
      </div>

      <hr className="border-dark-hover" />

      {/* Email Subjects */}
      <SubjectsSection sector={sector} />

      {/* Templates */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Email Body (Copy & Paste)</h3>
        <CopyBlock
          title="Short & Direct Email Template"
          text={templates[sector]?.email || ''}
          onTextChange={handleEmailChange}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Cover Letter (Couple Team)</h3>
        <CopyBlock
          title="Cover Letter Content"
          text={templates[sector]?.coverLetter || ''}
          onTextChange={handleCoverLetterChange}
          downloadPath={currentCoverLetterPath} // Pasamos la ruta dinámica aquí
        />
      </div>

      {/* Other Relevant Documents */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Other Relevant Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherDocuments.map((doc) => (
            <div key={doc.id} className="bg-dark-sidebar border border-dark-hover p-4 rounded-xl flex justify-between items-center group hover:border-accent transition-all duration-200 hover:shadow-lg hover:shadow-accent/10">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <File size={18} className="text-accent" />
                  {doc.name}
                </p>
                <p className="text-xs text-dark-subtext mt-1">{doc.description}</p>
              </div>
              <a
                href={doc.path}
                download={doc.file}
                className="p-2 bg-dark-bg rounded-full text-dark-text group-hover:text-accent transition-all duration-200 hover:scale-110"
                title={`Download ${doc.name}`}
              >
                <FileDown size={20} className="group-hover:animate-bounce" />
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ResourcesView;