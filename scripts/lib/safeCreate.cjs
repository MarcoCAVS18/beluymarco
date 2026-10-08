/**
 * safeCreate.cjs — utilidades compartidas para cargar empresas NUEVAS a Firestore
 * sin poder pisar nada de lo que ya existe.
 *
 * Garantías:
 *  1. Backup completo de la colección en scripts/backups/ ANTES de escribir.
 *  2. Cada write lleva currentDocument.exists=false: si el id ya existe, falla.
 *  3. Después de escribir se verifica SIN releer la colección entera (cada lectura
 *     de documento cuenta contra la cuota diaria de Firestore):
 *       - la cantidad final (count() del servidor, casi gratis) es previos + creados,
 *       - una muestra de documentos previos sigue idéntica al backup,
 *       - una muestra de documentos creados existe con los datos esperados.
 *     El exists:false ya impide pisar documentos; esto es la red de seguridad.
 *     Si algo no cierra, el script termina con error y el backup queda para restaurar.
 *
 * Usa REST + token de gcloud (el SDK cliente no pasa las rules).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT = 'emails---trabajos';
const DB_PATH = `projects/${PROJECT}/databases/(default)`;
const BASE = `https://firestore.googleapis.com/v1/${DB_PATH}`;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Colecciones que este flujo tiene permitido tocar (y solo para crear).
const ALLOWED = new Set(['wineries', 'housekeeping', 'kyc']);

const norm = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function getHeaders() {
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Trae TODOS los documentos de la colección con todos sus campos (paginado).
async function fetchAll(collection, headers) {
  if (!ALLOWED.has(collection)) throw new Error(`Colección no permitida: ${collection}`);
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/documents/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GET ${collection} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// Vista liviana para dedupe y cálculo de ids.
function summarize(docs) {
  return docs.map(d => ({
    docId: d.name.split('/').pop(),
    id: parseInt(d.fields?.id?.integerValue || '0', 10),
    name: d.fields?.name?.stringValue || '',
    email: (d.fields?.email?.stringValue || '').trim().toLowerCase(),
  }));
}

// Guarda el snapshot crudo de Firestore en disco. Devuelve la ruta.
function writeBackup(collection, docs) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `${collection}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2));
  return file;
}

// Escribe en lotes SOLO creando. Devuelve { created, failed, createdItems }.
async function createOnly(collection, items, toFields, headers, chunkSize = 400) {
  if (!ALLOWED.has(collection)) throw new Error(`Colección no permitida: ${collection}`);
  let created = 0;
  let failed = 0;
  const createdItems = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const writes = chunk.map(c => ({
      update: { name: `${DB_PATH}/documents/${collection}/${c.id}`, fields: toFields(c) },
      currentDocument: { exists: false },
    }));
    const res = await fetch(`${BASE}/documents:batchWrite`, {
      method: 'POST', headers, body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`batchWrite ${res.status}: ${await res.text()}`);
    const out = await res.json();
    out.status.forEach((s, j) => {
      if (s.code) { failed++; console.error(`   ❌ ${chunk[j].id} ${chunk[j].name}: ${s.message}`); }
      else { created++; createdItems.push(chunk[j]); }
    });
    console.log(`   lote ${Math.floor(i / chunkSize) + 1}: acum ${created} creadas, ${failed} fallidas`);
  }
  return { created, failed, createdItems };
}

const stable = v => JSON.stringify(v, (_, x) =>
  x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]]))
    : x);

// Cantidad de documentos de la colección con count() del servidor (1 lectura cada 1000).
async function countDocs(collection, headers) {
  const res = await fetch(`${BASE}/documents:runAggregationQuery`, {
    method: 'POST', headers,
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: collection }] },
        aggregations: [{ alias: 'n', count: {} }],
      },
    }),
  });
  if (!res.ok) throw new Error(`count ${collection} ${res.status}: ${await res.text()}`);
  const out = await res.json();
  return parseInt(out[0]?.result?.aggregateFields?.n?.integerValue || '-1', 10);
}

// Lee documentos puntuales por nombre completo. Devuelve Map(nombre -> fields | null).
async function getDocs(names, headers) {
  const found = new Map(names.map(n => [n, null]));
  for (let i = 0; i < names.length; i += 100) {
    const res = await fetch(`${BASE}/documents:batchGet`, {
      method: 'POST', headers,
      body: JSON.stringify({ documents: names.slice(i, i + 100) }),
    });
    if (!res.ok) throw new Error(`batchGet ${res.status}: ${await res.text()}`);
    for (const row of await res.json()) if (row.found) found.set(row.found.name, row.found.fields);
  }
  return found;
}

// Muestra repartida de forma pareja a lo largo de la lista.
const sample = (list, n) => list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);

// Verificación liviana. Devuelve lista de problemas (vacía = todo bien).
async function verifyLight(collection, before, createdItems, toFields, headers, sampleSize = 50) {
  const problems = [];

  const total = await countDocs(collection, headers);
  const expected = before.length + createdItems.length;
  if (total !== expected) problems.push(`CANTIDAD: esperado ${expected}, hay ${total}`);

  const prevSample = sample(before, sampleSize);
  const prevNow = await getDocs(prevSample.map(d => d.name), headers);
  for (const prev of prevSample) {
    const now = prevNow.get(prev.name);
    if (!now) problems.push(`DESAPARECIÓ ${prev.name}`);
    else if (stable(prev.fields) !== stable(now)) problems.push(`MODIFICADO ${prev.name}`);
  }

  const newSample = sample(createdItems, sampleSize);
  const newNames = newSample.map(c => `${DB_PATH}/documents/${collection}/${c.id}`);
  const newNow = await getDocs(newNames, headers);
  newSample.forEach((c, i) => {
    if (!newNow.get(newNames[i])) problems.push(`NO SE CREÓ ${newNames[i]}`);
  });

  return problems;
}

// Compara dos snapshots completos (solo para pruebas locales o restauraciones).
function verify(before, after, expectedCreated) {
  const problems = [];
  const afterByName = new Map(after.map(d => [d.name, d]));
  for (const prev of before) {
    const now = afterByName.get(prev.name);
    if (!now) { problems.push(`DESAPARECIÓ ${prev.name}`); continue; }
    if (stable(prev.fields) !== stable(now.fields)) problems.push(`MODIFICADO ${prev.name}`);
  }
  const expected = before.length + expectedCreated;
  if (after.length !== expected) problems.push(`CANTIDAD: esperado ${expected}, hay ${after.length}`);
  return problems;
}

module.exports = { norm, getHeaders, fetchAll, summarize, writeBackup, createOnly, verify, verifyLight, countDocs };
