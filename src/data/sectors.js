// Metadatos de cada rubro y de los estados, compartidos por todas las vistas.
import { Wine, Hotel, Fingerprint } from 'lucide-react';
import { COUNTRIES } from './countries';

export const SECTORS = {
  winery: {
    id: 'winery',
    label: 'Wineries',
    short: 'Wineries',
    icon: Wine,
    // Clases de Tailwind por rubro (definidas en index.css como --color-*)
    bg: 'bg-winery',
    text: 'text-winery',
    tint: 'bg-winery/10',
    hex: '#8B2C6F',
    nameLabel: 'Bodega',
    seasonField: 'harvestStart',
    seasonLabel: 'Inicio de vendimia',
    seasonPlaceholder: 'ej. "finales de agosto"',
  },
  housekeeping: {
    id: 'housekeeping',
    label: 'Housekeeping',
    short: 'Hoteles',
    icon: Hotel,
    bg: 'bg-housekeeping',
    text: 'text-housekeeping',
    tint: 'bg-housekeeping/10',
    hex: '#F29A38',
    nameLabel: 'Hotel / resort',
    seasonField: 'season',
    seasonLabel: 'Temporada',
    seasonPlaceholder: 'ej. "Invierno 2026"',
  },
  kyc: {
    id: 'kyc',
    label: 'KYC',
    short: 'KYC',
    icon: Fingerprint,
    bg: 'bg-kyc',
    text: 'text-kyc',
    tint: 'bg-kyc/10',
    hex: '#4E4BD6',
    nameLabel: 'Empresa',
    seasonField: 'segment',
    seasonLabel: 'Segmento',
    seasonPlaceholder: 'Cripto / Fintech / RegTech / BPO',
  },
};

export const SECTOR_IDS = ['winery', 'housekeeping', 'kyc'];

// Los valores guardados en Firestore siguen en inglés; acá solo cambia lo que se muestra.
export const STATUS_META = {
  Pending: { label: 'Pendiente', pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', hex: '#94A3B8', rank: 1 },
  Sent: { label: 'Enviado', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', hex: '#3B82F6', rank: 2 },
  Replied: { label: 'Respondió', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', hex: '#F59E0B', rank: 3 },
  Interview: { label: 'Entrevista', pill: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', hex: '#8B5CF6', rank: 4 },
  Offer: { label: 'Oferta', pill: 'bg-green-50 text-green-700', dot: 'bg-green-500', hex: '#22C55E', rank: 5 },
  Rejected: { label: 'Rechazado', pill: 'bg-red-50 text-red-700', dot: 'bg-red-500', hex: '#EF4444', rank: 0 },
};

const FALLBACK_STATUS = { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', hex: '#94A3B8', rank: 0 };

export const statusMeta = (status) => STATUS_META[status] || { ...FALLBACK_STATUS, label: status || 'Sin estado' };

// Estados que cuentan como "en conversación" (hubo respuesta)
export const ACTIVE_STATUSES = ['Replied', 'Interview', 'Offer'];

// Nombre del país en español a partir del código ISO (usa la API del navegador)
let regionNames = null;
export const countryName = (code) => {
  if (!code || code === 'XX') return 'Sin país';
  try {
    if (!regionNames) regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
};

// Texto de ubicación para mostrar: si `location` es solo el nombre del país (en inglés,
// como quedó en las cargas de OSM), se muestra el país en español; si termina con el
// país en inglés, se reemplaza por el nombre en español.
const EN_NAMES = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name.toLowerCase()]));
export const displayPlace = (c) => {
  const loc = (c.location || '').trim();
  const name = countryName(c.country);
  const en = EN_NAMES[c.country];
  if (!loc || loc.toLowerCase() === en || loc.toLowerCase() === name.toLowerCase()) return name;
  // "Zuchwil, Switzerland" -> "Zuchwil, Suiza"
  if (en && loc.toLowerCase().endsWith(`, ${en}`)) return `${loc.slice(0, -en.length)}${name}`;
  return loc;
};
