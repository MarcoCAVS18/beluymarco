/**
 * loadEmpresasNuevas.cjs — carga src/data/empresas-nuevas.json como docs NUEVOS en wineries.
 *
 * SOLO crea: cada write lleva currentDocument.exists=false, así que si un id ya
 * existiera la escritura falla en vez de pisar. No toca ningún documento existente.
 * Dedupe previo contra Firestore por email y por nombre normalizado.
 *
 * Usa REST + token de gcloud (ver MEMORY.md: el SDK cliente no pasa las rules).
 *
 * Uso:
 *   node scripts/loadEmpresasNuevas.cjs            # dry-run
 *   node scripts/loadEmpresasNuevas.cjs --execute  # aplica
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT = 'emails---trabajos';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;
const DRY_RUN = !process.argv.includes('--execute');

const COUNTRY = {
  France: 'FR', Italy: 'IT', 'United States': 'US', Germany: 'DE', Australia: 'AU',
  Spain: 'ES', 'South Africa': 'ZA', Portugal: 'PT', Argentina: 'AR', Austria: 'AT',
  Chile: 'CL', Greece: 'GR', Hungary: 'HU', England: 'GB', Canada: 'CA', Bulgaria: 'BG',
  'New Zealand': 'NZ', Uruguay: 'UY', Cyprus: 'CY', Bolivia: 'BO', Switzerland: 'CH',
  Croatia: 'HR', Iran: 'IR', Czechia: 'CZ', Albania: 'AL', Liechtenstein: 'LI',
  Georgia: 'GE', Luxembourg: 'LU', Lebanon: 'LB', Ireland: 'IE', Romania: 'RO',
  Armenia: 'AM', Israel: 'IL',
};

const norm = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function fetchExisting() {
  const docs = []; let pt = '';
  do {
    const url = `${BASE}/documents/wineries?pageSize=300&mask.fieldPaths=id&mask.fieldPaths=name&mask.fieldPaths=email${pt ? `&pageToken=${pt}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GET wineries ${res.status}: ${await res.text()}`);
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
  const nuevas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'empresas-nuevas.json'), 'utf8'));
  const existing = await fetchExisting();
  const maxId = Math.max(...existing.map(e => e.id));
  const byEmail = new Set(existing.map(e => e.email).filter(Boolean));
  const byName = new Set(existing.map(e => norm(e.name)));
  console.log(`Wineries existentes: ${existing.length} (maxId ${maxId}) · JSON: ${nuevas.length} entradas`);

  const skipped = [];
  const toCreate = [];
  let nextId = maxId + 1;
  const now = new Date().toISOString();

  for (const e of nuevas) {
    const email = e.email.trim().toLowerCase();
    if (byEmail.has(email)) { skipped.push(`${e.nombre} <${email}> (email ya en la base)`); continue; }
    if (byName.has(norm(e.nombre))) { skipped.push(`${e.nombre} (nombre ya en la base)`); continue; }
    const extras = (e.emails || []).filter(x => x.trim().toLowerCase() !== email);
    const notes = [
      e.fuenteWebsite ? `Web: ${e.fuenteWebsite}` : '',
      extras.length ? `Otros emails: ${extras.join(', ')}` : '',
    ].filter(Boolean).join(' | ');
    toCreate.push({
      id: nextId++,
      name: e.nombre.trim(),
      email,
      location: e.ubicacion.trim(),
      country: COUNTRY[e.ubicacion.split(',').pop().trim()] || 'XX',
      notes,
    });
  }

  console.log(`\nA crear: ${toCreate.length} (ids ${toCreate[0]?.id}-${toCreate[toCreate.length - 1]?.id}) · Salteadas por duplicado: ${skipped.length}`);
  skipped.slice(0, 30).forEach(s => console.log(`   skip: ${s}`));
  if (skipped.length > 30) console.log(`   ... y ${skipped.length - 30} más`);
  console.log('\nMuestra:');
  toCreate.slice(0, 5).forEach(c => console.log(`   ${c.id} ${c.name} <${c.email}> — ${c.location} [${c.country}]`));

  if (DRY_RUN) { console.log('\n🔍 Dry-run: nada escrito. --execute para aplicar.'); return; }

  const toDoc = c => ({
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/wineries/${c.id}`,
      fields: {
        id: { integerValue: String(c.id) },
        name: { stringValue: c.name },
        email: { stringValue: c.email },
        emailVerified: { booleanValue: false },
        location: { stringValue: c.location },
        country: { stringValue: c.country },
        harvestStart: { stringValue: '' },
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
  console.log(`\n✅ Listo: ${created} wineries creadas, ${failed} fallidas, ${skipped.length} salteadas por duplicado.`);
})().catch(e => { console.error('❌', e); process.exit(1); });
