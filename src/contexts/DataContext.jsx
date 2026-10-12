import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCompaniesByCountry,
  getCountryCounts,
  getStatusCounts,
  getCompaniesByStatus,
  updateWinery,
  updateHousekeeping,
  updateKyc,
  createWinery,
  createHousekeeping,
  createKyc,
  getConfig,
} from '../firebase/services';
import { COUNTRIES } from '../data/countries';
import { SECTOR_IDS, ACTIVE_STATUSES, STATUS_META } from '../data/sectors';
import { DataContext } from './dataContext';

// Las colecciones tienen miles de empresas, así que NUNCA se leen enteras:
//  - las empresas se leen por país, solo de los países elegidos en cada rubro;
//  - los totales por país y por estado salen de count() del servidor (casi gratis);
//  - "En conversación" es una consulta chica por estado (Replied/Interview/Offer).
// Lo leído queda en memoria toda la sesión; los conteos por país, 12 h en el navegador.
const API = {
  winery: { col: 'wineries', update: updateWinery, create: createWinery },
  housekeeping: { col: 'housekeeping', update: updateHousekeeping, create: createHousekeeping },
  kyc: { col: 'kyc', update: updateKyc, create: createKyc },
};

// Mismas claves de localStorage que usaba el Tracker, así se conserva lo elegido
const SELECTION_KEY = 'selectedCountries';
const COUNTS_KEY = 'countryCounts';
const COUNTS_TTL_MS = 12 * 60 * 60 * 1000;

const readJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin localStorage dura solo la sesión
  }
};

const readSelection = (sector) => {
  const saved = readJSON(`${SELECTION_KEY}:${API[sector].col}`);
  return Array.isArray(saved) ? saved : [];
};
const readCounts = (sector) => {
  const saved = readJSON(`${COUNTS_KEY}:${API[sector].col}`);
  return saved && Date.now() - saved.at < COUNTS_TTL_MS ? saved.counts : null;
};

const bySector = (fn) => Object.fromEntries(SECTOR_IDS.map((id) => [id, fn(id)]));

export const DataProvider = ({ children }) => {
  const [selected, setSelectedState] = useState(() => bySector(readSelection));
  const [cache, setCache] = useState(() => bySector(() => ({}))); // { sector: { país: empresas[] } }
  const [counts, setCounts] = useState(() => bySector(readCounts)); // { sector: { país: n } | null }
  const [statusCounts, setStatusCounts] = useState(() => bySector(() => null));
  const [conversations, setConversations] = useState(() => bySector(() => []));
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inflight = useRef(new Set()); // `${sector}:${país}` que se están leyendo

  // Arranque: config + conteos + conversaciones (todo liviano)
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const statuses = Object.keys(STATUS_META);
      const [cfg, ...rest] = await Promise.all([
        getConfig(),
        ...SECTOR_IDS.map((id) => getStatusCounts(API[id].col, statuses)),
        ...SECTOR_IDS.map((id) => getCompaniesByStatus(API[id].col, ACTIVE_STATUSES)),
      ]);
      setConfig(cfg || {});
      setStatusCounts(bySector((id) => rest[SECTOR_IDS.indexOf(id)]));
      setConversations(bySector((id) => rest[SECTOR_IDS.length + SECTOR_IDS.indexOf(id)]));
      setError(null);
    } catch (err) {
      console.error('Error cargando resumen:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Conteos por país de cada rubro (si no están guardados en el navegador)
  useEffect(() => {
    SECTOR_IDS.forEach((id) => {
      if (counts[id]) return;
      getCountryCounts(API[id].col, [...COUNTRIES.map((c) => c.code), 'XX'])
        .then((result) => {
          writeJSON(`${COUNTS_KEY}:${API[id].col}`, { at: Date.now(), counts: result });
          setCounts((prev) => ({ ...prev, [id]: result }));
        })
        .catch((err) => console.error(`Error contando ${API[id].col}:`, err));
    });
    // Solo al montar: después los conteos se ajustan localmente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lee los países elegidos que todavía no están en memoria
  useEffect(() => {
    SECTOR_IDS.forEach((id) => {
      const missing = selected[id].filter((cc) => !cache[id][cc] && !inflight.current.has(`${id}:${cc}`));
      if (!missing.length) return;
      missing.forEach((cc) => inflight.current.add(`${id}:${cc}`));
      Promise.all(missing.map((cc) => getCompaniesByCountry(API[id].col, cc)))
        .then((results) => {
          setCache((prev) => {
            const next = { ...prev[id] };
            missing.forEach((cc, i) => (next[cc] = results[i]));
            return { ...prev, [id]: next };
          });
        })
        .catch((err) => {
          console.error(`Error cargando ${API[id].col}:`, err);
          setError(err.message);
        })
        .finally(() => {
          missing.forEach((cc) => inflight.current.delete(`${id}:${cc}`));
        });
    });
  }, [selected, cache]);

  const setSelected = useCallback((sector, codes) => {
    const unique = [...new Set(codes)];
    writeJSON(`${SELECTION_KEY}:${API[sector].col}`, unique);
    setSelectedState((prev) => ({ ...prev, [sector]: unique }));
  }, []);

  // Empresas en pantalla de cada rubro = las de sus países elegidos
  const data = useMemo(
    () => bySector((id) => selected[id].flatMap((cc) => cache[id][cc] || [])),
    [selected, cache]
  );

  // Países elegidos que todavía no llegaron de Firestore
  const loadingCountries = useMemo(
    () => bySector((id) => selected[id].filter((cc) => !cache[id][cc])),
    [selected, cache]
  );

  // Busca una empresa en memoria (países cargados o conversaciones)
  const findCompany = useCallback(
    (sector, id) =>
      Object.values(cache[sector]).flat().find((c) => c.id === id) || conversations[sector].find((c) => c.id === id) || null,
    [cache, conversations]
  );

  // Aplica cambios en memoria: países cargados, conversaciones y conteos por estado
  const patchLocal = useCallback((sector, ids, updates, previous) => {
    const set = new Set(ids);
    const apply = (list) => list.map((c) => (set.has(c.id) ? { ...c, ...updates } : c));
    setCache((prev) => ({
      ...prev,
      [sector]: Object.fromEntries(Object.entries(prev[sector]).map(([cc, list]) => [cc, apply(list)])),
    }));
    setConversations((prev) => {
      let list = apply(prev[sector]);
      if (updates.status !== undefined) {
        // Entra o sale de "En conversación" según el nuevo estado
        list = list.filter((c) => ACTIVE_STATUSES.includes(c.status));
        if (ACTIVE_STATUSES.includes(updates.status)) {
          for (const p of previous) if (!list.some((c) => c.id === p.id)) list.push({ ...p, ...updates });
        }
      }
      return { ...prev, [sector]: list };
    });
    if (updates.status !== undefined) {
      setStatusCounts((prev) => {
        const sc = { ...(prev[sector] || {}) };
        for (const p of previous) {
          if (p.status === updates.status) continue;
          if (sc[p.status]) sc[p.status]--;
          sc[updates.status] = (sc[updates.status] || 0) + 1;
        }
        return { ...prev, [sector]: sc };
      });
    }
  }, []);

  const update = useCallback(
    async (sector, id, updates) => {
      const before = findCompany(sector, id);
      await API[sector].update(id, updates);
      patchLocal(sector, [id], updates, before ? [before] : []);
    },
    [findCompany, patchLocal]
  );

  const updateMany = useCallback(
    async (sector, ids, updates) => {
      const before = ids.map((id) => findCompany(sector, id)).filter(Boolean);
      await Promise.all(ids.map((id) => API[sector].update(id, updates)));
      patchLocal(sector, ids, updates, before);
    },
    [findCompany, patchLocal]
  );

  const create = useCallback(async (sector, payload) => {
    const created = await API[sector].create(payload);
    const cc = created.country || 'XX';
    // Si ese país ya está en memoria se suma; si no, se lee completo cuando se elija
    setCache((prev) => (prev[sector][cc] ? { ...prev, [sector]: { ...prev[sector], [cc]: [...prev[sector][cc], created] } } : prev));
    setCounts((prev) => {
      const next = { ...(prev[sector] || {}), [cc]: ((prev[sector] || {})[cc] || 0) + 1 };
      writeJSON(`${COUNTS_KEY}:${API[sector].col}`, { at: Date.now(), counts: next });
      return { ...prev, [sector]: next };
    });
    setStatusCounts((prev) => ({ ...prev, [sector]: { ...(prev[sector] || {}), [created.status]: ((prev[sector] || {})[created.status] || 0) + 1 } }));
    return created;
  }, []);

  // Recargar: vuelve a leer los países elegidos y el resumen
  const reload = useCallback(() => {
    setCache(bySector(() => ({})));
    loadSummary();
  }, [loadSummary]);

  const value = useMemo(
    () => ({
      data,
      selected,
      setSelected,
      loadingCountries,
      counts,
      statusCounts,
      conversations,
      findCompany,
      statusOptions: config?.statusOptions || [],
      flags: config?.flags || {},
      resumes: config?.resumes || [],
      otherDocuments: config?.otherDocuments || [],
      coverLetters: config?.coverLetters || {},
      loading,
      error,
      reload,
      update,
      updateMany,
      create,
    }),
    [data, selected, setSelected, loadingCountries, counts, statusCounts, conversations, findCompany, config, loading, error, reload, update, updateMany, create]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
