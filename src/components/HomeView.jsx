import { useMemo, useState } from 'react';
import { Search, X, FileText, ChevronRight, LogOut, MessageCircle } from 'lucide-react';
import CountryFlag from './CountryFlag';
import StatusPill from './ui/StatusPill';
import StatusBar from './ui/StatusBar';
import { useData } from '../hooks/useFirebaseData';
import { useAuth } from '../hooks/useAuth';
import { SECTORS, SECTOR_IDS, ACTIVE_STATUSES, countryName, displayPlace } from '../data/sectors';
import { isRecentlyAdded } from '../data/constants';
import { normalizeText } from '../utils/geo';

const HomeView = ({ goToCompanies, goToResources, onOpenCompany }) => {
  const { data, counts, statusCounts, conversations: convBySector, selected } = useData();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [allConversations, setAllConversations] = useState(false);

  // Resumen por rubro con conteos del servidor (no hace falta tener las empresas cargadas)
  const summary = useMemo(
    () =>
      Object.fromEntries(
        SECTOR_IDS.map((id) => {
          const sc = statusCounts[id] || {};
          const byCountry = counts[id];
          return [
            id,
            {
              total: byCountry ? Object.values(byCountry).reduce((n, v) => n + v, 0) : Object.values(sc).reduce((n, v) => n + v, 0),
              sent: sc.Sent || 0,
              active: ACTIVE_STATUSES.reduce((n, s) => n + (sc[s] || 0), 0),
              recent: data[id].filter((c) => !c.hidden && isRecentlyAdded(c.createdAt)).length,
            },
          ];
        })
      ),
    [counts, statusCounts, data]
  );

  // Empresas que respondieron (lo más importante para seguir)
  const conversations = useMemo(
    () => SECTOR_IDS.flatMap((id) => convBySector[id].filter((c) => !c.hidden).map((c) => ({ ...c, sector: id }))),
    [convBySector]
  );

  // Países con más empresas, sumando todos los rubros (conteos del servidor).
  // La barra de estados solo se puede mostrar para los países ya cargados.
  const countries = useMemo(() => {
    const map = new Map();
    for (const id of SECTOR_IDS) {
      for (const [code, n] of Object.entries(counts[id] || {})) {
        if (!map.has(code)) map.set(code, { code, total: 0, bySector: {}, byStatus: {}, loaded: 0 });
        const s = map.get(code);
        s.total += n;
        s.bySector[id] = n;
      }
      for (const c of data[id]) {
        const s = map.get(c.country || 'XX');
        if (!s || c.hidden) continue;
        s.byStatus[c.status] = (s.byStatus[c.status] || 0) + 1;
        s.loaded++;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  }, [counts, data]);

  // Búsqueda en todos los rubros, sobre los países cargados y las conversaciones
  const q = normalizeText(query);
  const results = useMemo(() => {
    if (q.length < 2) return [];
    const out = [];
    const seen = new Set();
    for (const id of SECTOR_IDS) {
      for (const c of [...convBySector[id], ...data[id]]) {
        const key = `${id}-${c.id}`;
        if (c.hidden || seen.has(key)) continue;
        if (normalizeText(c.name).includes(q) || normalizeText(c.location).includes(q) || normalizeText(c.email).includes(q)) {
          seen.add(key);
          out.push({ ...c, sector: id });
          if (out.length >= 30) return out;
        }
      }
    }
    return out;
  }, [data, convBySector, q]);

  const loadedCountries = SECTOR_IDS.reduce((n, id) => n + selected[id].length, 0);

  const initials = 'MB';

  return (
    <div className="space-y-7">
      {/* Saludo */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-[2rem] leading-tight font-bold tracking-tight">
            ¡Hola!
            <br />
            Marco y Belu
          </h1>
          <p className="text-muted mt-1">Organicemos la búsqueda de trabajo.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="w-11 h-11 rounded-full bg-housekeeping text-white font-semibold flex items-center justify-center shadow-sm ring-4 ring-housekeeping/20"
            aria-label="Cuenta"
          >
            {initials}
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-60 bg-card rounded-2xl shadow-xl border border-line p-2 z-30 fade-in">
              <div className="px-3 py-2 text-xs text-muted truncate">{user?.email}</div>
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-surface text-red-600">
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buscador global */}
      <div>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa, ciudad o email"
            className="w-full bg-card rounded-2xl py-4 pl-5 pr-16 text-[15px] outline-none shadow-sm border border-transparent focus:border-primary"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-surface text-muted flex items-center justify-center" aria-label="Borrar">
              <X size={18} />
            </button>
          ) : (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
              <Search size={18} />
            </span>
          )}
        </div>
        {q.length >= 2 && (
          <div className="mt-3 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">Nada coincide con "{query}".</p>
            ) : (
              results.map((c) => <MiniCompany key={`${c.sector}-${c.id}`} company={c} onClick={() => onOpenCompany(c.sector, c.id)} />)
            )}
            {results.length >= 30 && <p className="text-xs text-muted text-center">Mostrando las primeras 30. Buscá desde Empresas para ver todas.</p>}
            <p className="text-xs text-muted text-center">
              {loadedCountries ? `Busca en los ${loadedCountries} países cargados y en las que respondieron.` : 'Todavía no cargaste ningún país: busca solo en las que respondieron.'}
            </p>
          </div>
        )}
      </div>

      {/* Tarjetas por rubro */}
      {q.length < 2 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTOR_IDS.map((id) => {
              const s = SECTORS[id];
              const Icon = s.icon;
              const sum = summary[id];
              return (
                <button key={id} onClick={() => goToCompanies(id)} className={`${s.bg} text-white rounded-3xl p-4 text-left min-h-[10.5rem] flex flex-col shadow-sm active:scale-[0.98] transition-transform`}>
                  <div className="flex items-start justify-between">
                    <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Icon size={22} />
                    </span>
                    {sum.recent > 0 && <span className="text-[11px] font-semibold bg-white/25 rounded-full px-2 py-0.5">+{sum.recent} nuevas</span>}
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="text-lg font-semibold leading-tight">{s.label}</div>
                    <div className="text-white/85 text-sm tabular-nums">{sum.total.toLocaleString('es')} empresas</div>
                    <div className="text-white/75 text-xs mt-2">
                      {sum.sent.toLocaleString('es')} enviadas · {sum.active} con respuesta
                    </div>
                  </div>
                </button>
              );
            })}
            <button onClick={goToResources} className="bg-resources text-white rounded-3xl p-4 text-left min-h-[10.5rem] flex flex-col shadow-sm active:scale-[0.98] transition-transform">
              <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <FileText size={22} />
              </span>
              <div className="mt-auto pt-4">
                <div className="text-lg font-semibold leading-tight">Recursos</div>
                <div className="text-white/85 text-sm">CVs y templates</div>
                <div className="text-white/75 text-xs mt-2">Emails, asuntos y documentos</div>
              </div>
            </button>
          </div>

          {/* En conversación */}
          <section>
            <SectionTitle icon={MessageCircle} title="En conversación" count={conversations.length} />
            {conversations.length === 0 ? (
              <p className="text-sm text-muted bg-card rounded-2xl p-4">Todavía nadie respondió. Cuando una empresa conteste, marcala como "Respondió" y aparece acá.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {(allConversations ? conversations : conversations.slice(0, 5)).map((c) => (
                  <MiniCompany key={`${c.sector}-${c.id}`} company={c} onClick={() => onOpenCompany(c.sector, c.id)} />
                ))}
              </div>
            )}
            {conversations.length > 5 && (
              <button onClick={() => setAllConversations((v) => !v)} className="w-full mt-2 py-2.5 text-sm font-medium text-primary">
                {allConversations ? 'Ver menos' : `Ver todas (${conversations.length})`}
              </button>
            )}
          </section>

          {/* Países */}
          <section>
            <SectionTitle title="Países" action="Ver todos" onAction={() => goToCompanies(null, { mode: 'countries' })} />
            <div className="-mx-4 px-4 lg:mx-0 lg:px-0 flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto no-scrollbar snap-x pb-1">
              {countries.map((c) => {
                // Al tocar, abre el rubro con más empresas en ese país
                const top = Object.entries(c.bySector).sort((a, b) => b[1] - a[1])[0][0];
                return (
                  <button
                    key={c.code}
                    onClick={() => goToCompanies(top, { country: c.code, mode: 'list' })}
                    className="snap-start shrink-0 w-44 lg:w-auto bg-card rounded-2xl p-4 text-left shadow-sm"
                  >
                    <CountryFlag code={c.code} size="lg" />
                    <div className="font-semibold mt-3 truncate">{countryName(c.code)}</div>
                    <div className="text-xs text-muted tabular-nums">{c.total.toLocaleString('es')} empresas</div>
                    {c.loaded > 0 ? <StatusBar byStatus={c.byStatus} total={c.loaded} /> : <div className="h-2 mt-3 rounded-full bg-surface" />}
                    <div className="flex gap-2 mt-2.5">
                      {SECTOR_IDS.filter((id) => c.bySector[id]).map((id) => (
                        <span key={id} className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${SECTORS[id].tint} ${SECTORS[id].text}`}>
                          {SECTORS[id].short} {c.bySector[id]}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title, count, action, onAction }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xl font-semibold flex items-center gap-2">
      {Icon && <Icon size={20} className="text-primary" />}
      {title}
      {count > 0 && <span className="text-sm font-medium text-muted">({count})</span>}
    </h2>
    {action && (
      <button onClick={onAction} className="text-sm font-medium text-primary flex items-center">
        {action}
        <ChevronRight size={16} />
      </button>
    )}
  </div>
);

const MiniCompany = ({ company: c, onClick }) => {
  const s = SECTORS[c.sector];
  const Icon = s.icon;
  return (
    <button onClick={onClick} className="w-full bg-card rounded-2xl p-3 flex items-center gap-3 text-left shadow-sm">
      <span className={`shrink-0 w-11 h-11 rounded-xl ${s.bg} text-white flex items-center justify-center`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{c.name}</div>
        <div className="text-xs text-muted truncate flex items-center gap-1.5">
          <CountryFlag code={c.country} size="sm" />
          <span className="truncate">{displayPlace(c)}</span>
        </div>
      </div>
      <StatusPill status={c.status} />
    </button>
  );
};

export default HomeView;
