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

const lib = require('./lib/safeCreate.cjs');

const DRY_RUN = !process.argv.includes('--execute');
const COLLECTION = 'wineries';

const COUNTRY = {
  France: 'FR', Italy: 'IT', 'United States': 'US', Germany: 'DE', Australia: 'AU',
  Spain: 'ES', 'South Africa': 'ZA', Portugal: 'PT', Argentina: 'AR', Austria: 'AT',
  Chile: 'CL', Greece: 'GR', Hungary: 'HU', England: 'GB', Canada: 'CA', Bulgaria: 'BG',
  'New Zealand': 'NZ', Uruguay: 'UY', Cyprus: 'CY', Bolivia: 'BO', Switzerland: 'CH',
  Croatia: 'HR', Iran: 'IR', Czechia: 'CZ', Albania: 'AL', Liechtenstein: 'LI',
  Georgia: 'GE', Luxembourg: 'LU', Lebanon: 'LB', Ireland: 'IE', Romania: 'RO',
  Armenia: 'AM', Israel: 'IL',
};

const { norm } = lib;

(async () => {
  const nuevas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'empresas-nuevas.json'), 'utf8'));
  const headers = lib.getHeaders();
  const before = await lib.fetchAll(COLLECTION, headers);
  const existing = lib.summarize(before);
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

  const toFields = c => ({
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
  });

  const backupFile = lib.writeBackup(COLLECTION, before);
  console.log(`\n💾 Backup guardado: ${backupFile} (${before.length} docs)`);

  const { created, failed, createdItems } = await lib.createOnly(COLLECTION, toCreate, toFields, headers);

  console.log('\n🔎 Verificando que no se pisó nada...');
  const problems = await lib.verifyLight(COLLECTION, before, createdItems, toFields, headers);
  if (problems.length) {
    console.error(`❌ VERIFICACIÓN FALLÓ (${problems.length} problemas). Backup: ${backupFile}`);
    problems.slice(0, 20).forEach(p => console.error('   ' + p));
    process.exit(1);
  }
  console.log(`✅ Listo: ${created} creadas, ${failed} fallidas, ${skipped.length} salteadas. Los ${before.length} docs previos quedaron intactos.`);
})().catch(e => { console.error('❌', e); process.exit(1); });
