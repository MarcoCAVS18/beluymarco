import { useState } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import Sheet from './ui/Sheet';
import CountryFlag from './CountryFlag';
import { useData } from '../hooks/useFirebaseData';
import { SECTORS, countryName } from '../data/sectors';
import { normalizeText } from '../utils/geo';

// Elegir qué países se cargan en un rubro. Solo se leen de Firestore las empresas de
// los países elegidos; la cantidad de cada país sale de count() (casi sin costo).
const CountryPicker = ({ open, onClose, sector }) => {
  const { counts, selected, setSelected } = useData();
  const [draft, setDraft] = useState(selected[sector]);
  const [q, setQ] = useState('');

  // Al abrir, arranca desde lo que ya está elegido
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(selected[sector]);
      setQ('');
    }
  }

  const sectorCounts = counts[sector];
  const list = Object.entries(sectorCounts || {})
    .map(([code, n]) => ({ code, n, name: countryName(code) }))
    .filter((c) => !q || normalizeText(c.name).includes(normalizeText(q)) || c.code.toLowerCase() === q.toLowerCase())
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'es'));

  const toggle = (code) => setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));
  const total = draft.reduce((n, code) => n + (sectorCounts?.[code] || 0), 0);

  const apply = () => {
    setSelected(sector, draft);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Países de ${SECTORS[sector].label}`}
      subtitle="Solo se cargan las empresas de los países elegidos."
      footer={
        <div className="flex gap-2">
          {draft.length > 0 && (
            <button onClick={() => setDraft([])} className="flex-1 py-3 rounded-2xl bg-surface text-sm font-medium">
              Ninguno
            </button>
          )}
          <button onClick={apply} className="flex-[2] py-3 rounded-2xl bg-primary text-white text-sm font-semibold">
            {draft.length ? `Ver ${total.toLocaleString('es')} empresas` : 'Listo'}
          </button>
        </div>
      }
    >
      <div className="sticky top-0 bg-card pb-3 -mx-1 px-1 z-10">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar país..." className="w-full bg-surface border border-line rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
      </div>
      {!sectorCounts ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" />
          Contando empresas por país...
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((c) => {
            const on = draft.includes(c.code);
            return (
              <button
                key={c.code}
                onClick={() => toggle(c.code)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left ${on ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface'}`}
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-primary border-primary text-white' : 'border-line'}`}>
                  {on && <Check size={14} />}
                </span>
                <CountryFlag code={c.code} size="md" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted tabular-nums">{c.n.toLocaleString('es')}</span>
              </button>
            );
          })}
          {list.length === 0 && <p className="text-sm text-muted text-center py-6">No hay países con ese nombre.</p>}
        </div>
      )}
    </Sheet>
  );
};

export default CountryPicker;
