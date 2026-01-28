import { useState, useEffect } from 'react';
import {
  getWineries,
  getHousekeeping,
  updateWinery,
  updateHousekeeping,
  createWinery,
  createHousekeeping,
  getTemplates,
  updateTemplate,
  getFlags,
  getStatusOptions,
  getResumes,
  getOtherDocuments,
  getCoverLetters
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

export const useTemplates = () => {
  const [templates, setTemplates] = useState({
    winery: { email: '', coverLetter: '' },
    housekeeping: { email: '', coverLetter: '' }
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
