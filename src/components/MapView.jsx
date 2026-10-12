import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, AttributionControl, useMap } from 'react-leaflet';
import { Loader2, Layers, ChevronUp, ChevronDown, Globe2 } from 'lucide-react';
import SectorToggle from './SectorToggle';
import CountryFlag from './CountryFlag';
import StatusPill from './ui/StatusPill';
import CountryPicker from './CountryPicker';
import { useData } from '../hooks/useFirebaseData';
import { STATUS_META, statusMeta, countryName } from '../data/sectors';
import { loadCoordsTable, resolveCoords } from '../utils/geo';
import 'leaflet/dist/leaflet.css';

// Cuántas empresas se listan dentro del popup de un punto
const POPUP_LIMIT = 12;

// Encuadra el mapa en los puntos visibles cuando cambia el rubro o un filtro
// (fitKey), pero no cuando solo cambia el estado de una empresa desde el popup.
const FitBounds = ({ points, fitKey }) => {
  const map = useMap();
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    const points = pointsRef.current;
    if (!points.length) return;
    // Percentiles 3-97 ponderados por cantidad de empresas: unos pocos puntos lejanos
    // (Canadá, Japón) no obligan a mostrar el mundo entero
    const range = (idx) => {
      const vals = points.map((p) => [p.coords[idx], p.companies.length]).sort((a, b) => a[0] - b[0]);
      const total = vals.reduce((n, v) => n + v[1], 0);
      const at = (q) => {
        let acc = 0;
        for (const [v, w] of vals) {
          acc += w;
          if (acc >= total * q) return v;
        }
        return vals[vals.length - 1][0];
      };
      return points.length < 8 ? [vals[0][0], vals[vals.length - 1][0]] : [at(0.03), at(0.97)];
    };
    const [south, north] = range(0);
    const [west, east] = range(1);
    map.fitBounds([[south, west], [north, east]], { padding: [30, 30], maxZoom: 9 });
  }, [fitKey, map]);
  return null;
};

// Leaflet calcula mal el tamaño si el contenedor cambia después de montar
const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
};

const MapView = ({ sector, setSector, onOpenCompany }) => {
  const { data, selected, loadingCountries } = useData();
  const [pickerOpen, setPickerOpen] = useState(false);
  const chosen = selected[sector];
  const [table, setTable] = useState(null);
  const [tableError, setTableError] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [showApprox, setShowApprox] = useState(true);

  useEffect(() => {
    loadCoordsTable()
      .then(setTable)
      .catch((err) => {
        console.error('Error cargando coordenadas:', err);
        setTableError(true);
      });
  }, []);

  const items = useMemo(() => data[sector].filter((c) => !c.hidden), [data, sector]);

  // Ubica cada empresa y las agrupa por punto (varias empresas en la misma ciudad = 1 círculo)
  const { groups, counts, approxCount, missing } = useMemo(() => {
    const out = { groups: [], counts: {}, approxCount: 0, missing: 0 };
    if (!table) return out;
    const byKey = new Map();
    for (const c of items) {
      out.counts[c.status] = (out.counts[c.status] || 0) + 1;
      if (statusFilter && c.status !== statusFilter) continue;
      const r = resolveCoords(c, table);
      if (!r) {
        out.missing++;
        continue;
      }
      if (r.precision === 'country') {
        out.approxCount++;
        if (!showApprox) continue;
      }
      const key = `${r.coords[0]},${r.coords[1]}`;
      if (!byKey.has(key)) byKey.set(key, { key, coords: r.coords, approx: r.precision === 'country', companies: [] });
      byKey.get(key).companies.push(c);
    }
    for (const g of byKey.values()) {
      // El color del punto es el estado más avanzado del grupo
      g.best = g.companies.reduce((best, c) => (statusMeta(c.status).rank > statusMeta(best).rank ? c.status : best), g.companies[0].status);
      g.companies.sort((a, b) => statusMeta(b.status).rank - statusMeta(a.status).rank);
    }
    out.groups = [...byKey.values()];
    return out;
  }, [items, table, statusFilter, showApprox]);

  const shown = groups.reduce((n, g) => n + g.companies.length, 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem-env(safe-area-inset-bottom)-env(safe-area-inset-top))] lg:h-[calc(100dvh-4rem)] gap-3">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <SectorToggle sector={sector} onSectorChange={(s) => { setSector(s); setStatusFilter(null); }} />
        </div>
        <button onClick={() => setPickerOpen(true)} className="shrink-0 flex items-center gap-1.5 px-3 rounded-2xl bg-card border border-line text-sm font-medium" aria-label="Elegir países">
          <Globe2 size={16} className="text-primary" />
          <span className="tabular-nums">{chosen.length}</span>
          {loadingCountries[sector].length > 0 && <Loader2 size={14} className="animate-spin text-primary" />}
        </button>
      </div>
      <CountryPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sector={sector} />

      <div className="relative flex-1 min-h-[320px] rounded-3xl overflow-hidden shadow-sm bg-card">
        {!table && !tableError && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/80">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        )}
        {table && chosen.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-card/85 p-6 text-center">
            <Globe2 size={28} className="text-primary" />
            <p className="text-sm text-muted max-w-xs">Elegí uno o más países para ver sus empresas en el mapa.</p>
            <button onClick={() => setPickerOpen(true)} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
              Elegir países
            </button>
          </div>
        )}
        {tableError && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/90 text-sm text-red-600 p-6 text-center">
            No se pudieron cargar las ubicaciones. Recargá la página.
          </div>
        )}
        <MapContainer center={[48, 10]} zoom={4} preferCanvas className="h-full w-full" worldCopyJump attributionControl={false}>
          <AttributionControl position="topright" prefix={false} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <InvalidateSize />
          <FitBounds points={groups} fitKey={`${sector}|${statusFilter}|${showApprox}|${!!table}|${groups.length > 0}`} />
          {groups.map((g) => {
            const n = g.companies.length;
            const color = statusMeta(g.best).hex;
            return (
              <CircleMarker
                key={g.key}
                center={g.coords}
                radius={Math.min(6 + Math.sqrt(n) * 2.2, 24)}
                pathOptions={{
                  color: g.approx ? color : '#fff',
                  weight: g.approx ? 2 : 1.5,
                  dashArray: g.approx ? '4 3' : null,
                  fillColor: color,
                  fillOpacity: g.approx ? 0.35 : 0.85,
                }}
              >
                <Popup maxWidth={300} minWidth={240}>
                  <div className="text-ink">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CountryFlag code={g.companies[0].country} size="sm" />
                      {g.approx ? countryName(g.companies[0].country) : g.companies[0].location || countryName(g.companies[0].country)}
                    </div>
                    <div className="text-xs text-muted mb-2">
                      {n} {n === 1 ? 'empresa' : 'empresas'}
                      {g.approx && ' · sin ciudad, ubicadas en el centro del país'}
                    </div>
                    <div className="max-h-60 overflow-y-auto -mx-1">
                      {g.companies.slice(0, POPUP_LIMIT).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onOpenCompany(sector, c.id)}
                          className="w-full flex items-center justify-between gap-2 px-1 py-1.5 rounded-lg hover:bg-surface text-left"
                        >
                          <span className="text-sm truncate">{c.name}</span>
                          <StatusPill status={c.status} className="!px-2 !py-0.5 !text-[11px]" />
                        </button>
                      ))}
                    </div>
                    {n > POPUP_LIMIT && <div className="text-xs text-muted mt-1">y {n - POPUP_LIMIT} más</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Leyenda / filtro por estado, flotando sobre el mapa */}
        <div className="absolute left-3 right-3 bottom-3 z-[500] lg:right-auto lg:w-96">
          <div className="bg-card/95 backdrop-blur rounded-2xl shadow-lg">
            <button onClick={() => setLegendOpen((v) => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Layers size={16} className="text-primary" />
                {shown.toLocaleString('es')} de {items.length.toLocaleString('es')} en el mapa
                {statusFilter && <StatusPill status={statusFilter} />}
              </span>
              {legendOpen ? <ChevronDown size={18} className="text-muted" /> : <ChevronUp size={18} className="text-muted" />}
            </button>
            {legendOpen && (
              <div className="px-4 pb-4 space-y-3 fade-in">
                <div className="flex flex-wrap gap-2">
                  <LegendChip active={!statusFilter} onClick={() => setStatusFilter(null)}>
                    Todos
                  </LegendChip>
                  {Object.keys(STATUS_META)
                    .filter((s) => counts[s])
                    .map((s) => (
                      <LegendChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META[s].hex }} />
                        {STATUS_META[s].label} <span className="opacity-60">{counts[s]}</span>
                      </LegendChip>
                    ))}
                </div>
                {approxCount > 0 && (
                  <label className="flex items-start gap-2 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={showApprox} onChange={(e) => setShowApprox(e.target.checked)} className="mt-0.5 accent-primary" />
                    <span>
                      Mostrar {approxCount} sin ciudad (círculo punteado, en el centro del país). Si les cargás la ciudad en su ficha, aparecen en el lugar correcto.
                    </span>
                  </label>
                )}
                {missing > 0 && <p className="text-xs text-muted">{missing} sin país reconocido, no se muestran.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendChip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${active ? 'bg-ink text-white border-ink' : 'bg-card border-line'}`}
  >
    {children}
  </button>
);

export default MapView;
