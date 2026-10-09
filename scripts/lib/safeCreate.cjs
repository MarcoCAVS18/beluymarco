/**
 * safeCreate.cjs — utilidades compartidas para cargar empresas NUEVAS a Firestore
 * sin poder pisar nada de lo que ya existe.
 *
 * Garantías:
 *  1. Backup completo de la colección en scripts/backups/ ANTES de escribir.
 *  2. Cada write lleva currentDocument.exists=false: si el id ya existe, falla.
 *  3. Después de escribir se relee la colección y se verifica que:
 *       - no desapareció ningún documento previo,
 *       - ningún documento previo cambió (status, notes, hidden, email, etc.),
 *       - la cantidad final es exactamente previos + creados.
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
  // En el entorno remoto de Claude, CLOUDSDK_AUTH_ACCESS_TOKEN trae un placeholder del proxy
  // que pisa a la cuenta activada; se quita para que gcloud use la cuenta de servicio activa.
  const env = { ...process.env };
  if (env.CLOUDSDK_AUTH_ACCESS_TOKEN === 'proxy-injected') delete env.CLOUDSDK_AUTH_ACCESS_TOKEN;
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', env }).trim();
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

// Escribe en lotes SOLO creando. Devuelve { created, failed }.
async function createOnly(collection, items, toFields, headers, chunkSize = 400) {
  if (!ALLOWED.has(collection)) throw new Error(`Colección no permitida: ${collection}`);
  let created = 0;
  let failed = 0;
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
      if (s.code) { failed++; console.error(`   ERROR ${chunk[j].id} ${chunk[j].name}: ${s.message}`); }
      else created++;
    });
    console.log(`   lote ${Math.floor(i / chunkSize) + 1}: acum ${created} creadas, ${failed} fallidas`);
  }
  return { created, failed };
}

// Compara el estado posterior contra el backup. Devuelve lista de problemas.
function verify(before, after, expectedCreated) {
  const problems = [];
  const afterByName = new Map(after.map(d => [d.name, d]));
  for (const prev of before) {
    const now = afterByName.get(prev.name);
    if (!now) { problems.push(`DESAPARECIÓ ${prev.name}`); continue; }
    if (JSON.stringify(prev.fields) !== JSON.stringify(now.fields)) {
      problems.push(`MODIFICADO ${prev.name}`);
    }
  }
  const expected = before.length + expectedCreated;
  if (after.length !== expected) {
    problems.push(`CANTIDAD: esperado ${expected}, hay ${after.length}`);
  }
  return problems;
}

module.exports = { norm, getHeaders, fetchAll, summarize, writeBackup, createOnly, verify };
