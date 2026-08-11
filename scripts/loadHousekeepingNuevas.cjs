/**
 * loadHousekeepingNuevas.cjs — carga src/data/empresas-nuevas-housekeeping.json
 * como docs NUEVOS en housekeeping, filtrando SOLO los países pedidos.
 *
 * El JSON tiene 12368 entradas de scraping (OSM) de un montón de países; acá
 * solo se cargan Suiza, Suecia, Noruega, Finlandia y Austria (~3700 entradas)
 * para no gastar de más la cuota gratis de Firestore (20k writes/día en Spark
 * y en Blaze; 3700 escrituras no genera cargo).
 *
 * SOLO crea: cada write lleva currentDocument.exists=false, así que si un id ya
 * existiera la escritura falla en vez de pisar. No toca ningún documento existente
 * (status/notes/hidden/emails de los 509 docs actuales quedan intactos).
 * Dedupe previo contra Firestore por email y por nombre normalizado, y también
 * dentro del propio JSON (por email) para no crear duplicados entre sí.
 *
 * Usa REST + token de gcloud (ver MEMORY.md: el SDK cliente no pasa las rules).
 *
 * Uso:
 *   node scripts/loadHousekeepingNuevas.cjs            # dry-run
 *   node scripts/loadHousekeepingNuevas.cjs --execute  # aplica
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT = 'emails---trabajos';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;
const DRY_RUN = !process.argv.includes('--execute');

// Solo estos países por ahora (pedido explícito de Marco).
const COUNTRY = {
  Switzerland: 'CH',
  Sweden: 'SE',
  Norway: 'NO',
  Finland: 'FI',
  Austria: 'AT',
};

const norm = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function fetchExisting() {
  const docs = []; let pt = '';
  do {
    const url = `${BASE}/documents/housekeeping?pageSize=300&mask.fieldPaths=id&mask.fieldPaths=name&mask.fieldPaths=email${pt ? `&pageToken=${pt}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GET housekeeping ${res.status}: ${await res.text()}`);
    const d = await res.json();
    docs.push(...(d.documents || []));
    pt = d.nextPageToken || '';
  } while (pt);
  return docs.map(d => ({
    id: parseInt(d.fields?.id?.integerValue || '0', 10),
    name: d.fields?.name?.stringValue || '',
    email: (d.fields?.email?.stringValue || '').trim().toLowerCase(),
  }));
}

(async () => {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'empresas-nuevas-housekeeping.json'), 'utf8'));
  const subset = all.filter(e => COUNTRY[e.pais]);
  console.log(`JSON total: ${all.length} · Filtradas a los 5 países pedidos: ${subset.length}`);

  const existing = await fetchExisting();
  const maxId = Math.max(...existing.map(e => e.id));
  const byEmail = new Set(existing.map(e => e.email).filter(Boolean));
  const byName = new Set(existing.map(e => norm(e.name)));
  console.log(`Housekeeping existentes: ${existing.length} (maxId ${maxId})`);

  const skipped = [];
  const toCreate = [];
  const seenEmail = new Set(); // dedupe dentro del propio JSON filtrado
  let nextId = maxId + 1;
  const now = new Date().toISOString();

  for (const e of subset) {
    const email = e.email.trim().toLowerCase();
    if (byEmail.has(email) || seenEmail.has(email)) { skipped.push(`${e.nombre} <${email}> (email duplicado)`); continue; }
    if (byName.has(norm(e.nombre))) { skipped.push(`${e.nombre} (nombre ya en la base)`); continue; }
    seenEmail.add(email);
    toCreate.push({
      id: nextId++,
      name: e.nombre.trim(),
      email,
      location: e.ubicacion.trim(),
      country: COUNTRY[e.pais],
      notes: e.fuente ? `Fuente: ${e.fuente}` : '',
    });
  }

  console.log(`\nA crear: ${toCreate.length} (ids ${toCreate[0]?.id}-${toCreate[toCreate.length - 1]?.id}) · Salteadas por duplicado: ${skipped.length}`);
  const byCountry = {};
  toCreate.forEach(c => { byCountry[c.country] = (byCountry[c.country] || 0) + 1; });
  console.log('Por país:', JSON.stringify(byCountry));
  skipped.slice(0, 20).forEach(s => console.log(`   skip: ${s}`));
  if (skipped.length > 20) console.log(`   ... y ${skipped.length - 20} más`);
  console.log('\nMuestra:');
  toCreate.slice(0, 5).forEach(c => console.log(`   ${c.id} ${c.name} <${c.email}> — ${c.location} [${c.country}]`));

  if (DRY_RUN) { console.log('\n🔍 Dry-run: nada escrito. --execute para aplicar.'); return; }

  const toDoc = c => ({
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/housekeeping/${c.id}`,
      fields: {
        id: { integerValue: String(c.id) },
        name: { stringValue: c.name },
        email: { stringValue: c.email },
        emailVerified: { booleanValue: false },
        location: { stringValue: c.location },
        country: { stringValue: c.country },
        season: { stringValue: '' },
        status: { stringValue: 'Pending' },
        notes: { stringValue: c.notes },
        hidden: { booleanValue: false },
        createdAt: { timestampValue: now },
      },
    },
    currentDocument: { exists: false },
  });

  let created = 0, failed = 0;
  for (let i = 0; i < toCreate.length; i += 400) {
    const chunk = toCreate.slice(i, i + 400);
    const res = await fetch(`${BASE}/documents:batchWrite`, {
      method: 'POST', headers,
      body: JSON.stringify({ writes: chunk.map(toDoc) }),
    });
    if (!res.ok) { console.error(`❌ batch ${i / 400 + 1}: ${res.status} ${await res.text()}`); process.exit(1); }
    const out = await res.json();
    out.status.forEach((s, j) => {
      if (s.code) { failed++; console.error(`   ❌ ${chunk[j].id} ${chunk[j].name}: ${s.message}`); }
      else created++;
    });
    console.log(`   batch ${i / 400 + 1}: ok (acum: ${created} creadas, ${failed} fallidas)`);
  }
  console.log(`\n✅ Listo: ${created} housekeeping creadas, ${failed} fallidas, ${skipped.length} salteadas por duplicado.`);
})().catch(e => { console.error('❌', e); process.exit(1); });
