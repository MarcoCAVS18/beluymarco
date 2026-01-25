import React, { useState, useEffect } from 'react';
import { Copy, Check, FileDown, Wine, Hotel, Edit3, Save, X, File, Loader2 } from 'lucide-react';
import { useTemplates, useConfig } from '../hooks/useFirebaseData';

const CopyBlock = ({ title, text, onTextChange }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [saving, setSaving] = useState(false);

  // Update local state when text prop changes
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

const ResourcesView = () => {
  const [sector, setSector] = useState('winery'); // 'winery' or 'housekeeping'
  const { templates, loading: templatesLoading, updateTemplate } = useTemplates();
  const { resumes = [], otherDocuments = [], loading: configLoading } = useConfig();

  const loading = templatesLoading || configLoading;

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
      <div className="flex justify-center mb-8">
        <div className="bg-dark-sidebar p-1 rounded-full border border-dark-hover inline-flex">
          <button
            onClick={() => setSector('winery')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${sector === 'winery' ? 'bg-dark-surface text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
          >
            <Wine size={16} />
            Wineries
          </button>
          <button
            onClick={() => setSector('housekeeping')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${sector === 'housekeeping' ? 'bg-dark-surface text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
          >
            <Hotel size={16} />
            Housekeeping
          </button>
        </div>
      </div>

      {/* Download Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RESUMES.filter(r => r.type.toLowerCase() === sector).map((resume) => (
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

      {/* Templates */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Email Body (Copy & Paste)</h3>
        <CopyBlock
          title="Short & Direct Email Template"
          text={templates[sector].email}
          onTextChange={handleEmailChange}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Cover Letter (Couple Team)</h3>
        <CopyBlock
          title="Cover Letter Content"
          text={templates[sector].coverLetter}
          onTextChange={handleCoverLetterChange}
        />
      </div>

      {/* Other Relevant Documents */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Other Relevant Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OTHER_DOCUMENTS.map((doc) => (
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