import { useState, useEffect } from 'react';
import {
  getWineries,
  getHousekeeping,
  getKyc,
  updateWinery,
  updateHousekeeping,
  updateKyc,
  createWinery,
  createHousekeeping,
  createKyc,
  getTemplates,
  updateTemplate,
  getFlags,
  getStatusOptions,
  getResumes,
  getOtherDocuments,
  getCoverLetters,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject
} from '../firebase/services';

export const useWineries = () => {
  const [wineries, setWineries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWineries();
  }, []);

  const loadWineries = async () => {
    try {
      setLoading(true);
      const data = await getWineries();
      setWineries(data);
      setError(null);
    } catch (err) {
      console.error('Error loading wineries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWineryData = async (id, updates) => {
    try {
      await updateWinery(id, updates);
      setWineries(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    } catch (err) {
      console.error('Error updating winery:', err);
      throw err;
    }
  };

  const createWineryData = async (data) => {
    try {
      const newWinery = await createWinery(data);
      setWineries(prev => [...prev, newWinery]);
      return newWinery;
    } catch (err) {
      console.error('Error creating winery:', err);
      throw err;
    }
  };

  return { wineries, loading, error, updateWinery: updateWineryData, createWinery: createWineryData, reload: loadWineries };
};

export const useHousekeeping = () => {
  const [housekeeping, setHousekeeping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHousekeeping();
  }, []);

  const loadHousekeeping = async () => {
    try {
      setLoading(true);
      const data = await getHousekeeping();
      setHousekeeping(data);
      setError(null);
    } catch (err) {
      console.error('Error loading housekeeping:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateHousekeepingData = async (id, updates) => {
    try {
      await updateHousekeeping(id, updates);
      setHousekeeping(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    } catch (err) {
      console.error('Error updating housekeeping:', err);
      throw err;
    }
  };

  const createHousekeepingData = async (data) => {
    try {
      const newHousekeeping = await createHousekeeping(data);
      setHousekeeping(prev => [...prev, newHousekeeping]);
      return newHousekeeping;
    } catch (err) {
      console.error('Error creating housekeeping:', err);
      throw err;
    }
  };

  return { housekeeping, loading, error, updateHousekeeping: updateHousekeepingData, createHousekeeping: createHousekeepingData, reload: loadHousekeeping };
};

export const useKyc = () => {
  const [kyc, setKyc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const data = await getKyc();
      setKyc(data);
      setError(null);
    } catch (err) {
      console.error('Error loading kyc:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateKycData = async (id, updates) => {
    try {
      await updateKyc(id, updates);
      setKyc(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k));
    } catch (err) {
      console.error('Error updating kyc:', err);
      throw err;
    }
  };

  const createKycData = async (data) => {
    try {
      const newKyc = await createKyc(data);
      setKyc(prev => [...prev, newKyc]);
      return newKyc;
    } catch (err) {
      console.error('Error creating kyc:', err);
      throw err;
    }
  };

  return { kyc, loading, error, updateKyc: updateKycData, createKyc: createKycData, reload: loadKyc };
};

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
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, text } : s));
    } catch (err) {
      console.error('Error updating subject:', err);
      throw err;
    }
  };

  const removeSubject = async (id) => {
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting subject:', err);
      throw err;
    }
  };

  return { subjects, loading, error, addSubject, editSubject, removeSubject, reload: loadSubjects };
};

export const useConfig = () => {
  const [flags, setFlags] = useState({});
  const [statusOptions, setStatusOptions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLetters] = useState({});
  const [otherDocuments, setOtherDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [flagsData, statusData, resumesData, docsData, coverLettersData] = await Promise.all([
        getFlags(),
        getStatusOptions(),
        getResumes(),
        getOtherDocuments(),
        getCoverLetters()
      ]);
      setFlags(flagsData);
      setStatusOptions(statusData);
      setResumes(resumesData);
      setOtherDocuments(docsData);
      setCoverLetters(coverLettersData);
      setError(null);
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { flags, statusOptions, resumes, otherDocuments, coverLetters, loading, error };
};
