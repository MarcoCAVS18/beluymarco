// Resolución de coordenadas para el mapa a partir de `location` + `country`.
// La tabla (src/data/cityCoords.json) se genera con scripts/overture/build_city_coords.py
// y se carga recién cuando se abre el mapa (import dinámico).

export const normalizeText = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Tiene que ser IGUAL a tokens() de build_city_coords.py.
// "Hainfeld (Palatinado, Alemania)" -> ["hainfeld", "palatinado", "alemania"]
export const locationTokens = (location) =>
  (location || '')
    .split(/[,()/;]| - /)
    .map(normalizeText)
    .filter((t) => t.length > 1);

// "lech am arlberg" -> ["lech am arlberg", "lech am", "lech"] (igual que prefijos() del script)
export const tokenVariants = (token) => {
  const words = token.split(' ');
  const out = [];
  for (let n = words.length; n > 0; n--) {
    const v = words.slice(0, n).join(' ');
    if (v.length > 2) out.push(v);
  }
  return out;
};

let tablePromise = null;
export const loadCoordsTable = () => {
  if (!tablePromise) tablePromise = import('../data/cityCoords.json').then((m) => m.default || m);
  return tablePromise;
};

// Devuelve { coords: [lat, lng], precision: 'exact' | 'city' | 'country' } o null.
export const resolveCoords = (item, table) => {
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    return { coords: [item.lat, item.lng], precision: 'exact' };
  }
  const cc = (item.country || '').toUpperCase();
  for (const t of locationTokens(item.location)) {
    for (const v of tokenVariants(t)) {
      const hit = table.c[`${v}|${cc}`] || table.m[v];
      if (hit) return { coords: hit, precision: 'city' };
    }
  }
  const def = table.d[cc];
  return def ? { coords: def, precision: 'country' } : null;
};
