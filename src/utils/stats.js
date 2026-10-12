import { countryName } from '../data/sectors';

// Estadísticas por país: total y cantidad por estado (sin las ocultas, salvo que se pida)
export const countryStats = (items, { includeHidden = false } = {}) => {
  const map = new Map();
  for (const c of items) {
    if (c.hidden && !includeHidden) continue;
    const code = c.country || 'XX';
    if (!map.has(code)) map.set(code, { code, name: countryName(code), total: 0, byStatus: {} });
    const s = map.get(code);
    s.total++;
    s.byStatus[c.status] = (s.byStatus[c.status] || 0) + 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
};

