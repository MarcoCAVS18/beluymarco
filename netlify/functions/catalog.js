// netlify/functions/catalog.js
// Catálogo de empresas para los invitados. Los documentos de Firestore tienen los
// estados y notas privadas del admin, y las reglas no pueden ocultar campos, así que
// los invitados NO leen el catálogo directo: lo piden acá, que
//   1. verifica su sesión de Firebase (ID token) y que el email esté verificado,
//   2. lee su invitación en /members y exige status 'active' y el rubro habilitado,
//   3. lee el país pedido con la cuenta de servicio de SOLO LECTURA,
//   4. devuelve únicamente los campos públicos de cada empresa.
// Variables de entorno: FIREBASE_SA_KEY (JSON de la cuenta de servicio, rol
// Cloud Datastore Viewer) y VITE_FIREBASE_API_KEY.

import crypto from 'crypto';

const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const COLLECTIONS = { winery: 'wineries', housekeeping: 'housekeeping', kyc: 'kyc' };
const SEASON_FIELD = { winery: 'harvestStart', housekeeping: 'season', kyc: 'segment' };
const CACHE_MS = 10 * 60 * 1000; // lo leído se reusa 10 min entre todos los invitados
const RATE_LIMIT = 60; // pedidos por minuto por usuario (por instancia)

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

// ---------- Sesión del usuario ----------
async function verifyUser(authHeader) {
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;
  const res = await fetch(`${LOOKUP_URL}?key=${process.env.VITE_FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const user = (await res.json()).users?.[0];
  if (!user?.email || !user.emailVerified) return null;
  return user.email.toLowerCase();
}

// ---------- Cuenta de servicio (solo lectura) ----------
let saToken = null; // { token, exp }
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function serviceToken() {
  if (saToken && saToken.exp > Date.now() + 60000) return saToken.token;
  const sa = JSON.parse(process.env.FIREBASE_SA_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signature = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('No se pudo autenticar la cuenta de servicio');
  saToken = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return saToken.token;
}

const dbBase = () => {
  const projectId = JSON.parse(process.env.FIREBASE_SA_KEY).project_id;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
};

// Valor de Firestore REST -> JS (solo los tipos que usamos)
const decode = (v) => {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return { seconds: Math.floor(Date.parse(v.timestampValue) / 1000) };
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  return undefined;
};

async function getMember(email) {
  const res = await fetch(`${dbBase()}/members/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${await serviceToken()}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`members ${res.status}`);
  const f = (await res.json()).fields || {};
  return { status: decode(f.status), sectors: decode(f.sectors) || [] };
}

// Solo los campos públicos: nunca status, notes, hidden ni nada del admin
const publicCompany = (sector, f) => {
  const out = {
    id: decode(f.id),
    name: decode(f.name) || '',
    email: decode(f.email) || '',
    emailVerified: decode(f.emailVerified) ?? null,
    location: decode(f.location) || '',
    country: decode(f.country) || '',
    [SEASON_FIELD[sector]]: decode(f[SEASON_FIELD[sector]]) || '',
    createdAt: decode(f.createdAt) || null,
  };
  if (sector === 'kyc') out.applyUrl = decode(f.applyUrl) || '';
  if (typeof decode(f.lat) === 'number' && typeof decode(f.lng) === 'number') {
    out.lat = decode(f.lat);
    out.lng = decode(f.lng);
  }
  return out;
};

const cache = new Map(); // `${sector}:${país}` -> { at, companies }

async function companiesByCountry(sector, country) {
  const key = `${sector}:${country}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.companies;

  const res = await fetch(`${dbBase()}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await serviceToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: COLLECTIONS[sector] }],
        where: { fieldFilter: { field: { fieldPath: 'country' }, op: 'EQUAL', value: { stringValue: country } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`runQuery ${res.status}`);
  const rows = await res.json();
  const companies = rows
    .filter((r) => r.document)
    .map((r) => publicCompany(sector, r.document.fields || {}))
    .sort((a, b) => (a.id || 0) - (b.id || 0));
  cache.set(key, { at: Date.now(), companies });
  return companies;
}

// Límite simple de pedidos por usuario (frena que alguien gaste la cuota a propósito)
const hits = new Map();
const rateLimited = (email) => {
  const now = Date.now();
  const recent = (hits.get(email) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(email, recent);
  return recent.length > RATE_LIMIT;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Método no permitido' });

  const sector = event.queryStringParameters?.sector;
  const country = (event.queryStringParameters?.country || '').toUpperCase();
  if (!COLLECTIONS[sector] || !/^[A-Z]{2}$/.test(country)) return json(400, { error: 'Pedido inválido' });

  try {
    const email = await verifyUser(event.headers?.authorization || event.headers?.Authorization);
    if (!email) return json(401, { error: 'No autorizado' });
    if (rateLimited(email)) return json(429, { error: 'Demasiados pedidos, esperá un minuto' });

    const member = await getMember(email);
    if (!member || member.status !== 'active') return json(403, { error: 'Sin invitación activa' });
    if (!member.sectors.includes(sector)) return json(403, { error: 'Rubro no habilitado' });

    return json(200, { companies: await companiesByCountry(sector, country) });
  } catch (error) {
    console.error('catalog:', error.message);
    return json(500, { error: 'No se pudo leer el catálogo' });
  }
};
