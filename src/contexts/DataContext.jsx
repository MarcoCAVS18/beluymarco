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
import { getCatalogCountry, getCatalogStats, saveCatalogStats, getApplications, saveApplication, appId } from '../firebase/memberServices';
import { COUNTRIES } from '../data/countries';
import { SECTOR_IDS, ACTIVE_STATUSES, STATUS_META } from '../data/sectors';
import { useAuth } from '../hooks/useAuth';
import { DataContext } from './dataContext';

// Las colecciones tienen miles de empresas, así que NUNCA se leen enteras:
//  - las empresas se leen por país, solo de los países elegidos en cada rubro;
//  - los totales por país y por estado salen de count() del servidor (casi gratis);
//  - "En conversación" es una consulta chica por estado (Replied/Interview/Offer).
//
// Dos roles:
//  - Admin: lee y escribe el catálogo directo, como siempre.
//  - Invitado: el catálogo llega filtrado por la función `catalog` (solo sus rubros y
//    sin datos privados) y sus estados / notas / ocultas viven en su cuenta
//    (/users/{email}/applications); acá se superponen sobre cada empresa.
const API = {
  winery: { col: 'wineries', update: updateWinery, create: createWinery },
  housekeeping: { col: 'housekeeping', update: updateHousekeeping, create: createHousekeeping },
  kyc: { col: 'kyc', update: updateKyc, create: createKyc },
};

// Mismas claves de localStorage que usaba el Tracker, así se conserva lo elegido
const SELECTION_KEY = 'selectedCountries';
const COUNTS_KEY = 'countryCounts';
const COUNTS_TTL_MS = 12 * 60 * 60 * 1000;
const PERSONAL_FIELDS = ['status', 'notes', 'hidden'];

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

const bySector = (fn) => Object.fromEntries(SECTOR_IDS.map((id) => [id, fn(id)]));

export const DataProvider = ({ children }) => {
  const { user, role, member } = useAuth();
  const isAdmin = role === 'admin';
  const email = (user?.email || '').toLowerCase();
  // Las claves del navegador se separan por cuenta, por si se usa el mismo equipo
  const storeKey = useCallback((base, sector) => (isAdmin ? `${base}:${API[sector].col}` : `${base}:${email}:${API[sector].col}`), [isAdmin, email]);

  // Rubros que puede ver esta cuenta
  const sectors = useMemo(
    () => (isAdmin ? SECTOR_IDS : SECTOR_IDS.filter((s) => member?.sectors?.includes(s))),
    [isAdmin, member]
  );

  const [selected, setSelectedState] = useState(() =>
    bySector((id) => {
      const saved = readJSON(storeKey(SELECTION_KEY, id));
      return Array.isArray(saved) ? saved : [];
    })
  );
  const [cache, setCache] = useState(() => bySector(() => ({}))); // { sector: { país: empresas[] } }
  const [counts, setCounts] = useState(() =>
    bySector((id) => {
      if (!isAdmin) return null;
      const saved = readJSON(storeKey(COUNTS_KEY, id));
      return saved && Date.now() - saved.at < COUNTS_TTL_MS ? saved.counts : null;
    })
  );
  const [adminStatusCounts, setAdminStatusCounts] = useState(() => bySector(() => null));
  const [adminConversations, setAdminConversations] = useState(() => bySector(() => []));
  const [applications, setApplications] = useState({}); // invitado: { 'sector_id': app }
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inflight = useRef(new Set()); // `${sector}:${país}` que se están leyendo

  // Arranque liviano: conteos + conversaciones (admin) o stats + estados propios (invitado)
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const statuses = Object.keys(STATUS_META);
        const [cfg, ...rest] = await Promise.all([
          getConfig(),
          ...SECTOR_IDS.map((id) => getStatusCounts(API[id].col, statuses)),
          ...SECTOR_IDS.map((id) => getCompaniesByStatus(API[id].col, ACTIVE_STATUSES)),
        ]);
        setConfig(cfg || {});
        setAdminStatusCounts(bySector((id) => rest[SECTOR_IDS.indexOf(id)]));
        setAdminConversations(bySector((id) => rest[SECTOR_IDS.length + SECTOR_IDS.indexOf(id)]));
      } else {
        const [stats, apps] = await Promise.all([getCatalogStats(), getApplications(email)]);
        setCounts(bySector((id) => (sectors.includes(id) ? stats[id] || {} : null)));
        setApplications(Object.fromEntries(apps.map((a) => [appId(a.sector, a.companyId), a])));
        setConfig({});
      }
      setError(null);
    } catch (err) {
      console.error('Error cargando resumen:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, email, sectors]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Admin: conteos por país de cada rubro (si no están guardados en el navegador).
  // Se guardan también en /stats para que los invitados no tengan que contar.
  useEffect(() => {
    if (!isAdmin) return;
    SECTOR_IDS.forEach((id) => {
      if (counts[id]) {
        // Ya estaban en el navegador: igual se publican, así los invitados nunca ven ceros
        saveCatalogStats(id, counts[id]).catch((err) => console.error('Error guardando stats:', err));
        return;
      }
      getCountryCounts(API[id].col, [...COUNTRIES.map((c) => c.code), 'XX'])
        .then((result) => {
          writeJSON(storeKey(COUNTS_KEY, id), { at: Date.now(), counts: result });
          setCounts((prev) => ({ ...prev, [id]: result }));
          saveCatalogStats(id, result).catch((err) => console.error('Error guardando stats:', err));
        })
        .catch((err) => console.error(`Error contando ${API[id].col}:`, err));
    });
    // Solo al montar: después los conteos se ajustan localmente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lee los países elegidos que todavía no están en memoria
  useEffect(() => {
    sectors.forEach((id) => {
      const missing = selected[id].filter((cc) => !cache[id][cc] && !inflight.current.has(`${id}:${cc}`));
      if (!missing.length) return;
      missing.forEach((cc) => inflight.current.add(`${id}:${cc}`));
      const read = (cc) => (isAdmin ? getCompaniesByCountry(API[id].col, cc) : getCatalogCountry(id, cc));
      Promise.all(missing.map(read))
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
  }, [selected, cache, sectors, isAdmin]);

  const setSelected = useCallback(
    (sector, codes) => {
      const unique = [...new Set(codes)];
      writeJSON(storeKey(SELECTION_KEY, sector), unique);
      setSelectedState((prev) => ({ ...prev, [sector]: unique }));
    },
    [storeKey]
  );

  // Invitado: superpone sus estados sobre la empresa del catálogo
  const withPersonal = useCallback(
    (sector, c) => {
      if (isAdmin) return c;
      const a = applications[appId(sector, c.id)];
      return { ...c, status: a?.status || 'Pending', notes: a?.notes || '', hidden: !!a?.hidden };
    },
    [isAdmin, applications]
  );

  // Empresas en pantalla de cada rubro = las de sus países elegidos
  const data = useMemo(
    () => bySector((id) => (sectors.includes(id) ? selected[id].flatMap((cc) => (cache[id][cc] || []).map((c) => withPersonal(id, c))) : [])),
    [selected, cache, sectors, withPersonal]
  );

  const loadingCountries = useMemo(
    () => bySector((id) => (sectors.includes(id) ? selected[id].filter((cc) => !cache[id][cc]) : [])),
    [selected, cache, sectors]
  );

  // Invitado: conversaciones y conteos por estado salen de sus propios estados
  const memberConversations = useMemo(() => {
    if (isAdmin) return null;
    const out = bySector(() => []);
    for (const a of Object.values(applications)) {
      if (ACTIVE_STATUSES.includes(a.status) && out[a.sector]) {
        out[a.sector].push({ id: a.companyId, name: a.name, country: a.country, location: a.location, email: a.email, status: a.status, notes: a.notes, hidden: !!a.hidden });
      }
    }
    return out;
  }, [isAdmin, applications]);

  const memberStatusCounts = useMemo(() => {
    if (isAdmin) return null;
    return bySector((id) => {
      if (!sectors.includes(id)) return null;
      const total = Object.values(counts[id] || {}).reduce((n, v) => n + v, 0);
      const sc = {};
      for (const a of Object.values(applications)) if (a.sector === id && a.status !== 'Pending') sc[a.status] = (sc[a.status] || 0) + 1;
      sc.Pending = Math.max(0, total - Object.values(sc).reduce((n, v) => n + v, 0));
      return sc;
    });
  }, [isAdmin, applications, counts, sectors]);

  const conversations = isAdmin ? adminConversations : memberConversations;
  const statusCounts = isAdmin ? adminStatusCounts : memberStatusCounts;

  // Busca una empresa en memoria (países cargados o conversaciones)
  const findCompany = useCallback(
    (sector, id) => {
      const fromCache = Object.values(cache[sector]).flat().find((c) => c.id === id);
      if (fromCache) return withPersonal(sector, fromCache);
      return conversations[sector].find((c) => c.id === id) || null;
    },
    [cache, conversations, withPersonal]
  );

  // Admin: aplica cambios en memoria (países cargados, conversaciones y conteos)
  const patchAdmin = useCallback((sector, ids, updates, previous) => {
    const set = new Set(ids);
    const apply = (list) => list.map((c) => (set.has(c.id) ? { ...c, ...updates } : c));
    setCache((prev) => ({
      ...prev,
      [sector]: Object.fromEntries(Object.entries(prev[sector]).map(([cc, list]) => [cc, apply(list)])),
    }));
    setAdminConversations((prev) => {
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
      setAdminStatusCounts((prev) => {
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

  // Invitado: solo puede cambiar lo suyo (estado, notas, ocultas)
  const saveMember = useCallback(
    async (sector, company, updates) => {
      const personal = Object.fromEntries(Object.entries(updates).filter(([k]) => PERSONAL_FIELDS.includes(k)));
      if (!Object.keys(personal).length) return;
      await saveApplication(email, sector, company, personal);
      setApplications((prev) => {
        const key = appId(sector, company.id);
        const base = prev[key] || { sector, companyId: company.id, status: 'Pending', notes: '', hidden: false, name: company.name, country: company.country, location: company.location, email: company.email };
        return { ...prev, [key]: { ...base, ...personal } };
      });
    },
    [email]
  );

  const update = useCallback(
    async (sector, id, updates) => {
      const before = findCompany(sector, id);
      if (!isAdmin) {
        if (before) await saveMember(sector, before, updates);
        return;
      }
      await API[sector].update(id, updates);
      patchAdmin(sector, [id], updates, before ? [before] : []);
    },
    [isAdmin, findCompany, saveMember, patchAdmin]
  );

  const updateMany = useCallback(
    async (sector, ids, updates) => {
      const before = ids.map((id) => findCompany(sector, id)).filter(Boolean);
      if (!isAdmin) {
        await Promise.all(before.map((c) => saveMember(sector, c, updates)));
        return;
      }
      await Promise.all(ids.map((id) => API[sector].update(id, updates)));
      patchAdmin(sector, ids, updates, before);
    },
    [isAdmin, findCompany, saveMember, patchAdmin]
  );

  // Crear empresas: solo el admin (las reglas también lo impiden para los invitados)
  const create = useCallback(
    async (sector, payload) => {
      if (!isAdmin) throw new Error('Solo el admin puede crear empresas');
      const created = await API[sector].create(payload);
      const cc = created.country || 'XX';
      setCache((prev) => (prev[sector][cc] ? { ...prev, [sector]: { ...prev[sector], [cc]: [...prev[sector][cc], created] } } : prev));
      setCounts((prev) => {
        const next = { ...(prev[sector] || {}), [cc]: ((prev[sector] || {})[cc] || 0) + 1 };
        writeJSON(storeKey(COUNTS_KEY, sector), { at: Date.now(), counts: next });
        saveCatalogStats(sector, next).catch((err) => console.error('Error guardando stats:', err));
        return { ...prev, [sector]: next };
      });
      setAdminStatusCounts((prev) => ({ ...prev, [sector]: { ...(prev[sector] || {}), [created.status]: ((prev[sector] || {})[created.status] || 0) + 1 } }));
      return created;
    },
    [isAdmin, storeKey]
  );

  // Recargar: vuelve a leer los países elegidos y el resumen
  const reload = useCallback(() => {
    setCache(bySector(() => ({})));
    loadSummary();
  }, [loadSummary]);

  const value = useMemo(
    () => ({
      isAdmin,
      sectors,
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
    [isAdmin, sectors, data, selected, setSelected, loadingCountries, counts, statusCounts, conversations, findCompany, config, loading, error, reload, update, updateMany, create]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
