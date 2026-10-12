import { STATUS_META } from '../../data/sectors';

// Barra apilada con la proporción de cada estado (lo más avanzado primero)
const StatusBar = ({ byStatus, total, className = 'mt-3' }) => (
  <div className={`flex h-2 rounded-full overflow-hidden bg-surface ${className}`}>
    {Object.keys(STATUS_META)
      .filter((s) => byStatus[s])
      .sort((a, b) => STATUS_META[b].rank - STATUS_META[a].rank)
      .map((s) => (
        <span key={s} className={STATUS_META[s].dot} style={{ width: `${(byStatus[s] / total) * 100}%` }} />
      ))}
  </div>
);

export default StatusBar;
