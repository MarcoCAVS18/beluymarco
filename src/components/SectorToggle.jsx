import { SECTORS, SECTOR_IDS } from '../data/sectors';

// Selector de rubro tipo "segmented control": ocupa todo el ancho en el celular.
const SectorToggle = ({ sector, onSectorChange, includeKyc = true, counts }) => {
  const ids = includeKyc ? SECTOR_IDS : SECTOR_IDS.filter((id) => id !== 'kyc');
  return (
    <div className="flex w-full sm:w-auto sm:inline-flex bg-card border border-line rounded-2xl p-1 gap-1">
      {ids.map((id) => {
        const s = SECTORS[id];
        const Icon = s.icon;
        const active = sector === id;
        return (
          <button
            key={id}
            onClick={() => onSectorChange(id)}
            aria-pressed={active}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              active ? `${s.bg} text-white shadow-sm` : 'text-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{s.short}</span>
            {counts && (
              <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-muted'}`}>
                {counts[id]?.toLocaleString('es') ?? ''}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SectorToggle;
