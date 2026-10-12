import { useState, useEffect, useContext } from 'react';
import { DataContext } from '../contexts/dataContext';
import { clearQuickSendCache } from '../services/quickSend';
import {
  getTemplates,
  updateTemplate,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject
} from '../firebase/services';

export const useTemplates = () => {
  const [templates, setTemplates] = useState({
    winery: { email: '', coverLetter: '' },
    housekeeping: { email: '', coverLetter: '' },
    kyc: { email: '', coverLetter: '' }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates({
        winery: {
          email: data['winery-email']?.content || '',
          coverLetter: data['winery-cover-letter']?.content || ''
        },
        housekeeping: {
          email: data['housekeeping-email']?.content || '',
          coverLetter: data['housekeeping-cover-letter']?.content || ''
        },
        kyc: {
          email: data['kyc-email']?.content || '',
          coverLetter: data['kyc-cover-letter']?.content || ''
        }
      });
      setError(null);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateContent = async (sector, type, content) => {
    const templateId = `${sector}-${type === 'email' ? 'email' : 'cover-letter'}`;
    try {
      await updateTemplate(templateId, content);
      clearQuickSendCache();
      setTemplates(prev => ({
        ...prev,
        [sector]: {
          ...prev[sector],
          [type]: content
        }
      }));
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  };

  return { templates, loading, error, updateTemplate: updateTemplateContent };
};

export const useSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjects();
      setSubjects(data);
      setError(null);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async (sector, text) => {
    try {
      const newSubject = await createSubject({ sector, text });
      clearQuickSendCache();
      setSubjects(prev => [...prev, newSubject]);
      return newSubject;
    } catch (err) {
      console.error('Error creating subject:', err);
      throw err;
    }
  };

  const editSubject = async (id, text) => {
    try {
      await updateSubject(id, { text });
      clearQuickSendCache();
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, text } : s));
    } catch (err) {
      console.error('Error updating subject:', err);
      throw err;
    }
  };

  const removeSubject = async (id) => {
    try {
      await deleteSubject(id);
      clearQuickSendCache();
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting subject:', err);
      throw err;
    }
  };

  return { subjects, loading, error, addSubject, editSubject, removeSubject, reload: loadSubjects };
};

// Config de la app (estados, CVs, documentos, cover letters): viene del DataProvider,
// que la lee una sola vez junto con las empresas.
export const useConfig = () => {
  const { statusOptions, flags, resumes, otherDocuments, coverLetters, loading, error } = useData();
  return { flags, statusOptions, resumes, otherDocuments, coverLetters, loading, error };
};

// Empresas de todos los rubros + funciones para modificarlas (ver DataContext.jsx)
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData tiene que usarse dentro de <DataProvider>');
  return ctx;
};
