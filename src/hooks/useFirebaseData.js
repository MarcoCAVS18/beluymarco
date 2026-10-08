import { useState, useEffect, useCallback, useMemo } from 'react';
import { COUNTRIES } from '../data/countries';
import {
  getCompaniesByCountry,
  getCountryCounts,
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

// Cache a nivel de modulo: lo ya leido se comparte entre pestañas (Tracker/Mapa)
// y entre cambios de rubro, asi no se vuelve a leer de Firestore.
const companyCache = {}; // { [coleccion]: { [pais]: empresas[] } }
const countsCache = {}; // { [coleccion]: { [pais]: cantidad } }
const SELECTION_KEY = 'selectedCountries';
const COUNTS_KEY = 'countryCounts';
const COUNTS_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

const readStoredCounts = (collectionName) => {
  try {
    const saved = JSON.parse(localStorage.getItem(`${COUNTS_KEY}:${collectionName}`));
    return saved && Date.now() - saved.at < COUNTS_TTL_MS ? saved.counts : null;
  } catch {
    return null;
  }
};

const storeCounts = (collectionName, counts) => {
  try {
    localStorage.setItem(`${COUNTS_KEY}:${collectionName}`, JSON.stringify({ at: Date.now(), counts }));
  } catch {
    // sin localStorage los conteos solo duran la sesion
  }
};

const clearStoredCounts = (collectionName) => {
  try {
    localStorage.removeItem(`${COUNTS_KEY}:${collectionName}`);
  } catch {
    // nada que limpiar
  }
};

const readSelection = (collectionName) => {
  try {
    const saved = JSON.parse(localStorage.getItem(`${SELECTION_KEY}:${collectionName}`));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// Paises elegidos por rubro, recordados entre visitas. Vacio = no se carga nada.
export const useSelectedCountries = (collectionName) => {
  const [selected, setSelected] = useState(() => readSelection(collectionName));

  useEffect(() => {
    setSelected(readSelection(collectionName));
  }, [collectionName]);

  const update = (next) => {
    setSelected(next);
    try {
      localStorage.setItem(`${SELECTION_KEY}:${collectionName}`, JSON.stringify(next));
    } catch {
      // sin localStorage la seleccion solo dura la sesion
    }
  };

  return [selected, update];
};

// Cantidad de empresas por pais (para mostrar en el selector sin leer los documentos).
export const useCountryCounts = (collectionName, enabled = true) => {
  // El estado solo fuerza el re-render cuando llegan los conteos; el dato vive en countsCache
  const [, setVersion] = useState(0);
  const [failed, setFailed] = useState(false);

  // Si hay conteos guardados en el navegador (y no vencieron) no se consulta nada.
  const stored = useMemo(() => readStoredCounts(collectionName), [collectionName]);

  useEffect(() => {
    if (!enabled || countsCache[collectionName] || stored) return;
    let cancelled = false;
    getCountryCounts(collectionName, [...COUNTRIES.map(c => c.code), 'XX'])
      .then(result => {
        countsCache[collectionName] = result;
        storeCounts(collectionName, result);
        if (!cancelled) setVersion(v => v + 1);
      })
      .catch(err => {
        console.error(`Error contando ${collectionName}:`, err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [collectionName, enabled, stored]);

  const counts = countsCache[collectionName] || stored;
  return { counts: counts || {}, loading: enabled && !counts && !failed, failed };
};

const useCompanies = (collectionName, { countries = [], enabled = true } = {}, api) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const countriesKey = [...countries].sort().join(',');

  const collect = useCallback(() => {
    const cache = companyCache[collectionName] || {};
    return countries.flatMap(code => cache[code] || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, countriesKey]);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;
    const cache = (companyCache[collectionName] ||= {});
    if (force) countries.forEach(code => { delete cache[code]; });
    const missing = countries.filter(code => !cache[code]);

    if (missing.length === 0) {
      setItems(collect());
      return;
    }
    try {
      setLoading(true);
      const results = await Promise.all(missing.map(code => getCompaniesByCountry(collectionName, code)));
      missing.forEach((code, i) => { cache[code] = results[i]; });
      setItems(collect());
      setError(null);
    } catch (err) {
      console.error(`Error loading ${collectionName}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, countriesKey, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // Aplica el cambio al cache y a la lista en pantalla
  const patchCache = (id, updates) => {
    Object.values(companyCache[collectionName] || {}).forEach(list => {
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) list[idx] = { ...list[idx], ...updates };
    });
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const updateData = async (id, updates) => {
    try {
      await api.update(id, updates);
      patchCache(id, updates);
    } catch (err) {
      console.error(`Error updating ${collectionName}:`, err);
      throw err;
    }
  };

  const createData = async (data) => {
    try {
      const created = await api.create(data);
      const cache = (companyCache[collectionName] ||= {});
      // Solo se suma al cache si ese pais ya estaba cargado; si no, se leera completo luego
      if (cache[created.country]) cache[created.country] = [...cache[created.country], created];
      delete countsCache[collectionName];
      clearStoredCounts(collectionName);
      if (countries.includes(created.country)) setItems(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error(`Error creating ${collectionName}:`, err);
      throw err;
    }
  };

  return { items, loading, error, update: updateData, create: createData, reload: () => load(true) };
};

export const useWineries = (options) => {
  const { items, loading, error, update, create, reload } = useCompanies('wineries', options, { update: updateWinery, create: createWinery });
  return { wineries: items, loading, error, updateWinery: update, createWinery: create, reload };
};

export const useHousekeeping = (options) => {
  const { items, loading, error, update, create, reload } = useCompanies('housekeeping', options, { update: updateHousekeeping, create: createHousekeeping });
  return { housekeeping: items, loading, error, updateHousekeeping: update, createHousekeeping: create, reload };
};

export const useKyc = (options) => {
  const { items, loading, error, update, create, reload } = useCompanies('kyc', options, { update: updateKyc, create: createKyc });
  return { kyc: items, loading, error, updateKyc: update, createKyc: create, reload };
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
