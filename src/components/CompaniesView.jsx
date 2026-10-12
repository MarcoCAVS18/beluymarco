import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronDown, CheckSquare, Square, Copy, Check, Download, EyeOff, Eye, Globe2, List, ChevronRight, ShieldCheck, ExternalLink, Loader2, Send, RotateCw } from 'lucide-react';
import SectorToggle from './SectorToggle';
import CountryFlag from './CountryFlag';
import CountryPicker from './CountryPicker';
import SwipeToSend from './SwipeToSend';
import StatusPill from './ui/StatusPill';
import StatusBar from './ui/StatusBar';
import Sheet from './ui/Sheet';
import { useData } from '../hooks/useFirebaseData';
import { useExportCSV } from '../hooks/useExportCSV';
import { useQuickSend } from '../hooks/useQuickSend';
import { SECTORS, STATUS_META, ACTIVE_STATUSES, countryName, statusMeta, displayPlace } from '../data/sectors';
import { countryStats } from '../utils/stats';
import { isRecentlyAdded } from '../data/constants';
import { normalizeText } from '../utils/geo';

const PAGE = 40;

const matchesSearch = (c, q) =>
  !q ||
  normalizeText(c.name).includes(q) ||
  normalizeText(c.location).includes(q) ||
  normalizeText(c.email).includes(q) ||
  normalizeText(countryName(c.country)).includes(q);

const CompaniesView = ({ sector, setSector, filters, setFilters, onOpenCompany }) => {
  const { data, selected: selectedCountries, setSelected: setSelectedCountries, loadingCountries, counts, statusOptions, updateMany } = useData();
  const { exportToCSV } = useExportCSV();
  const items = data[sector];
  const chosen = selectedCountries[sector];
  const loadingSome = loadingCountries[sector].length > 0;

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [visible, setVisible] = useState(PAGE);
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bulkStatusSheet, setBulkStatusSheet] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(null); // id de la tarjeta con "Enviar" visible
  const [toast, setToast] = useState(null);

  const q = normalizeText(filters.search);
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  // Base: rubro + búsqueda + ocultas. Sobre esto se cuentan los estados.
  const base = useMemo(
    () => items.filter((c) => (filters.showHidden ? c.hidden : !c.hidden) && matchesSearch(c, q)),
    [items, q, filters.showHidden]
  );
  const byCountry = useMemo(
    () => (filters.country ? base.filter((c) => (c.country || 'XX') === filters.country) : base),
    [base, filters.country]
  );
  const filtered = useMemo(
    () => (filters.status ? byCountry.filter((c) => c.status === filters.status) : byCountry),
    [byCountry, filters.status]
  );

  const statusCounts = useMemo(() => {
    const acc = {};
    for (const c of byCountry) acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, [byCountry]);

  // Modo Países: todos los países del rubro (conteo del servidor) + detalle de los cargados
  const countries = useMemo(() => {
    const loaded = Object.fromEntries(countryStats(items).map((c) => [c.code, c]));
    return Object.entries(counts[sector] || {})
      .map(([code, n]) => loaded[code] || { code, name: countryName(code), total: n, byStatus: null })
      .filter((c) => !q || normalizeText(c.name).includes(q))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
  }, [items, counts, sector, q]);

  const hiddenCount = useMemo(() => items.filter((c) => c.hidden).length, [items]);

  // Al cambiar filtros vuelve al principio; al cambiar de rubro sale del modo selección
  // (se resetea durante el render, sin efecto)
  const listKey = `${sector}|${filters.search}|${filters.country}|${filters.status}|${filters.showHidden}|${chosen.join()}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  const [prevSector, setPrevSector] = useState(sector);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setVisible(PAGE);
  }
  if (sector !== prevSector) {
    setPrevSector(sector);
    setSelecting(false);
    setSelected(new Set());
    setSwipeOpen(null);
  }

  // Carga progresiva: cuando el final de la lista entra en pantalla, muestra más
  const sentinel = useRef(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => v + PAGE);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length, filters.mode]);

  const showToast = useCallback((text) => {
    setToast(text);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const statuses = statusOptions.length ? statusOptions.map((s) => s.label) : Object.keys(STATUS_META);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyEmails = () => {
    const source = selecting && selected.size ? filtered.filter((c) => selected.has(c.id)) : filtered;
    const emails = source.map((c) => c.email).filter((e) => e && e.trim());
    navigator.clipboard.writeText(emails.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const bulk = async (updates) => {
    try {
      await updateMany(sector, [...selected], updates);
      setSelected(new Set());
      setSelecting(false);
    } catch (error) {
      console.error('Error en la actualización en lote:', error);
    }
  };

  // Desde el modo Países: si el país no está cargado se suma a los elegidos
  const pickCountry = (code) => {
    if (!chosen.includes(code)) setSelectedCountries(sector, [...chosen, code]);
    set({ country: code, mode: 'list', status: null });
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const chosenTotal = chosen.reduce((n, cc) => n + ((counts[sector] || {})[cc] || 0), 0);

  return (
    <div className="space-y-4">
      <SectorToggle sector={sector} onSectorChange={setSector} />

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar por nombre, ciudad o email"
          className="w-full bg-card border border-line rounded-2xl py-3.5 pl-11 pr-11 text-sm outline-none focus:border-primary shadow-sm"
        />
        {filters.search && (
          <button onClick={() => set({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-surface text-muted" aria-label="Borrar búsqueda">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Modo: lista de empresas o resumen por país */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex bg-card border border-line rounded-xl p-1">
          {[
            { id: 'list', label: 'Empresas', icon: List },
            { id: 'countries', label: 'Países', icon: Globe2 },
          ].map(({ id, label, icon }) => {
            const Icon = icon;
            return (
              <button
                key={id}
                onClick={() => set({ mode: id })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${filters.mode === id ? 'bg-ink text-white' : 'text-muted'}`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
        {filters.mode === 'list' && chosen.length > 0 && (
          <div className="flex items-center gap-1">
            <IconButton onClick={() => { setSelecting((v) => !v); setSelected(new Set()); setSwipeOpen(null); }} active={selecting} label={selecting ? 'Cancelar selección' : 'Seleccionar'}>
              <CheckSquare size={18} />
            </IconButton>
            <IconButton onClick={copyEmails} label="Copiar emails">
              {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            </IconButton>
            <IconButton onClick={() => exportToCSV(items, statusOptions, sector, filters.status)} label="Descargar CSV">
              <Download size={18} />
            </IconButton>
          </div>
        )}
      </div>

      {filters.mode === 'countries' ? (
        <CountriesList countries={countries} chosen={chosen} loading={!counts[sector]} onPick={pickCountry} />
      ) : chosen.length === 0 ? (
        <ChooseCountries sector={sector} counts={counts[sector]} onOpenPicker={() => setPickerOpen(true)} onPick={(code) => setSelectedCountries(sector, [code])} />
      ) : (
        <>
          {/* Filtros: países + estados (scroll horizontal en el celular) */}
          <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.country ? (
              <button onClick={() => set({ country: null })} className="shrink-0 flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl text-sm font-medium border bg-ink text-white border-ink">
                <CountryFlag code={filters.country} size="sm" />
                {countryName(filters.country)}
                <X size={14} />
              </button>
            ) : (
              <button onClick={() => setPickerOpen(true)} className="shrink-0 flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl text-sm font-medium border bg-card border-line">
                {chosen.length === 1 ? <CountryFlag code={chosen[0]} size="sm" /> : <Globe2 size={15} />}
                {chosen.length === 1 ? countryName(chosen[0]) : `${chosen.length} países`}
                {loadingSome ? <Loader2 size={14} className="animate-spin text-primary" /> : <ChevronDown size={14} />}
              </button>
            )}
            <Chip active={!filters.status} onClick={() => set({ status: null })}>
              Todos <Count n={byCountry.length} />
            </Chip>
            {statuses.map((label) => {
              const m = statusMeta(label);
              return (
                <Chip key={label} active={filters.status === label} onClick={() => set({ status: filters.status === label ? null : label })}>
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  {m.label} <Count n={statusCounts[label] || 0} />
                </Chip>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {filtered.length.toLocaleString('es')} {filtered.length === 1 ? 'empresa' : 'empresas'}
              {filters.showHidden && ' ocultas'}
              {!selecting && filtered.some((c) => c.email) && <span className="lg:hidden"> · deslizá para enviar</span>}
            </span>
            {selecting && (
              <button onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)))} className="font-medium text-primary">
                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            )}
          </div>

          {/* Lista */}
          {loadingSome && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              Cargando {chosenTotal.toLocaleString('es')} empresas...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState search={filters.search} onClear={() => set({ search: '', country: null, status: null })} />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, visible).map((c) => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  sector={sector}
                  selecting={selecting}
                  selected={selected.has(c.id)}
                  swipeOpen={swipeOpen === c.id}
                  setSwipeOpen={(open) => setSwipeOpen(open ? c.id : null)}
                  onError={(err) => showToast(`No se pudo enviar a ${c.name}: ${err.message}`)}
                  onClick={() => (selecting ? toggle(c.id) : onOpenCompany(sector, c.id))}
                />
              ))}
            </div>
          )}
          {visible < filtered.length && <div ref={sentinel} className="h-10" />}

          {hiddenCount > 0 && (
            <button onClick={() => set({ showHidden: !filters.showHidden })} className="flex items-center gap-2 mx-auto text-sm text-muted hover:text-ink py-2">
              {filters.showHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              {filters.showHidden ? 'Volver a las visibles' : `Ver ocultas (${hiddenCount})`}
            </button>
          )}
        </>
      )}

      {/* Barra de acciones en lote (encima de la navegación inferior) */}
      {selecting && selected.size > 0 && (
        <div className="fixed left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-8 lg:w-[28rem] z-40 bg-ink text-white rounded-2xl shadow-2xl p-2 flex items-center gap-1 sheet-up">
          <span className="px-3 text-sm font-medium flex-1 whitespace-nowrap">{selected.size.toLocaleString('es')} <span className="text-white/60">selec.</span></span>
          <BulkButton onClick={() => setBulkStatusSheet(true)}>Estado</BulkButton>
          <BulkButton onClick={copyEmails}>{copied ? 'Copiado' : 'Emails'}</BulkButton>
          <BulkButton onClick={() => bulk({ hidden: !filters.showHidden })}>{filters.showHidden ? 'Mostrar' : 'Ocultar'}</BulkButton>
        </div>
      )}

      {/* Aviso de error del envío rápido */}
      {toast && (
        <div className="fixed left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-8 lg:w-[28rem] z-50 bg-red-600 text-white text-sm rounded-2xl shadow-2xl px-4 py-3 fade-in" role="alert">
          {toast}
        </div>
      )}

      <CountryPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sector={sector} />

      <Sheet open={bulkStatusSheet} onClose={() => setBulkStatusSheet(false)} title={`Cambiar estado de ${selected.size}`}>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((label) => {
            const m = statusMeta(label);
            return (
              <button
                key={label}
                onClick={() => {
                  setBulkStatusSheet(false);
                  bulk({ status: label });
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium ${m.pill}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
                {m.label}
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
};

// Tarjeta con envío rápido: deslizando en el celular, con un botón en pantallas grandes
const CompanyRow = ({ company: c, sector, selecting, selected, swipeOpen, setSwipeOpen, onError, onClick }) => {
  const meta = SECTORS[sector];
  const { state, send } = useQuickSend(c, sector, { onDone: () => setSwipeOpen(false), onError });
  const canSend = !!c.email && !selecting && !c.hidden;
  const resend = c.status !== 'Pending';

  return (
    <SwipeToSend enabled={canSend} isOpen={swipeOpen} onOpenChange={setSwipeOpen} state={state} onPress={send} color={meta.bg} resend={resend}>
      <CompanyCard company={c} sector={sector} selecting={selecting} selected={selected} onClick={onClick}>
        {canSend && <DesktopSend state={state} onPress={send} resend={resend} />}
      </CompanyCard>
    </SwipeToSend>
  );
};

const DesktopSend = ({ state, onPress, resend }) => {
  const Icon = { idle: Send, sending: Loader2, done: Check, error: RotateCw }[state];
  const tone = state === 'done' ? 'bg-green-600 text-white' : state === 'error' ? 'bg-red-600 text-white' : 'bg-surface text-primary hover:bg-primary hover:text-white';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      disabled={state === 'sending' || state === 'done'}
      title={resend ? 'Reenviar email' : 'Enviar email'}
      aria-label={resend ? 'Reenviar email' : 'Enviar email'}
      className={`hidden lg:flex shrink-0 w-9 h-9 rounded-xl items-center justify-center transition-colors ${tone}`}
    >
      <Icon size={16} className={state === 'sending' ? 'animate-spin' : ''} />
    </button>
  );
};

const CompanyCard = ({ company: c, sector, selecting, selected, onClick, children }) => {
  const meta = SECTORS[sector];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      className={`w-full text-left bg-card rounded-2xl p-3.5 flex items-center gap-3 border transition-colors cursor-pointer select-none ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-transparent shadow-sm hover:border-line'
      }`}
    >
      {selecting ? (
        selected ? <CheckSquare size={22} className="text-primary shrink-0" /> : <Square size={22} className="text-muted shrink-0" />
      ) : (
        <div className={`shrink-0 w-11 h-11 rounded-xl ${meta.tint} flex items-center justify-center`}>
          <CountryFlag code={c.country} size="md" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold truncate">{c.name}</span>
          {isRecentlyAdded(c.createdAt) && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-50 text-green-700">Nueva</span>
          )}
        </div>
        <div className="text-xs text-muted truncate mt-0.5">{displayPlace(c)}</div>
        <div className="text-xs text-muted/90 truncate mt-0.5 flex items-center gap-1 font-mono">
          {c.email ? (
            <>
              {c.emailVerified === true && <ShieldCheck size={12} className="text-green-600 shrink-0" />}
              <span className="truncate">{c.email}</span>
            </>
          ) : c.applyUrl ? (
            <span className="flex items-center gap-1 text-kyc font-sans"><ExternalLink size={12} /> Aplicar por formulario</span>
          ) : (
            <span className="italic font-sans">Sin email</span>
          )}
        </div>
      </div>
      <StatusPill status={c.status} className="shrink-0" />
      {children}
    </div>
  );
};

// Pantalla cuando el rubro no tiene países elegidos todavía
const ChooseCountries = ({ sector, counts, onOpenPicker, onPick }) => {
  const top = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm text-center">
      <span className={`mx-auto w-12 h-12 rounded-2xl ${SECTORS[sector].bg} text-white flex items-center justify-center`}>
        <Globe2 size={22} />
      </span>
      <h2 className="font-semibold text-lg mt-3">Elegí los países</h2>
      <p className="text-sm text-muted mt-1">Para no gastar lecturas de Firestore, solo se cargan las empresas de los países que elijas.</p>
      {!counts ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Contando empresas...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-5 text-left">
          {top.map(([code, n]) => (
            <button key={code} onClick={() => onPick(code)} className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface hover:bg-line">
              <CountryFlag code={code} size="md" />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{countryName(code)}</span>
                <span className="block text-xs text-muted tabular-nums">{n.toLocaleString('es')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button onClick={onOpenPicker} className="mt-4 w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold">
        Ver todos los países
      </button>
    </div>
  );
};

const CountriesList = ({ countries, chosen, loading, onPick }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" /> Contando empresas por país...
      </div>
    );
  }
  if (!countries.length) return <EmptyState />;
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {countries.map((c) => {
        const loaded = !!c.byStatus;
        const contacted = loaded ? c.total - (c.byStatus.Pending || 0) : 0;
        const active = loaded ? ACTIVE_STATUSES.reduce((n, s) => n + (c.byStatus[s] || 0), 0) : 0;
        return (
          <button key={c.code} onClick={() => onPick(c.code)} className="text-left bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <CountryFlag code={c.code} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-muted">
                  {c.total.toLocaleString('es')} empresas
                  {loaded ? ` · ${Math.round((contacted / c.total) * 100)}% contactadas` : chosen.includes(c.code) ? ' · cargando...' : ''}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </div>
            {loaded ? (
              <>
                <StatusBar byStatus={c.byStatus} total={c.total} />
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted">
                  <span>{(c.byStatus.Pending || 0).toLocaleString('es')} pendientes</span>
                  <span>{(c.byStatus.Sent || 0).toLocaleString('es')} enviadas</span>
                  {active > 0 && <span className="text-amber-700 font-medium">{active} con respuesta</span>}
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-primary font-medium">Tocá para cargar y ver el detalle</div>
            )}
          </button>
        );
      })}
    </div>
  );
};

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap ${
      active ? 'bg-ink text-white border-ink' : 'bg-card border-line text-ink'
    }`}
  >
    {children}
  </button>
);

const Count = ({ n }) => <span className="opacity-60 tabular-nums">{n.toLocaleString('es')}</span>;

const IconButton = ({ onClick, label, active, children }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`w-10 h-10 flex items-center justify-center rounded-xl border ${active ? 'bg-primary text-white border-primary' : 'bg-card border-line text-ink hover:border-muted'}`}
  >
    {children}
  </button>
);

const BulkButton = ({ onClick, children }) => (
  <button onClick={onClick} className="px-3 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20">
    {children}
  </button>
);

const EmptyState = ({ search, onClear }) => (
  <div className="text-center py-16 text-muted">
    <Search size={28} className="mx-auto mb-3 opacity-50" />
    <p className="font-medium text-ink">No hay resultados</p>
    <p className="text-sm mt-1">{search ? `Nada coincide con "${search}".` : 'Probá con otros filtros.'}</p>
    {onClear && (
      <button onClick={onClear} className="mt-4 px-4 py-2 rounded-xl bg-card border border-line text-sm font-medium text-ink">
        Limpiar filtros
      </button>
    )}
  </div>
);

export default CompaniesView;
