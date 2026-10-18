/**
 * loadHousekeepingNuevas.cjs — carga un JSON de empresas (nombre, email, ubicacion,
 * pais, fuente) como docs NUEVOS en housekeeping, filtrando SOLO los países pedidos.
 *
 * Por defecto lee src/data/empresas-nuevas-housekeeping-nordicos.json (Overture Maps,
 * hoteles de SE/NO/FI/DK). Ojo con la cuota gratis de Firestore: 20k writes/día.
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
 *   --file=src/data/otro.json   JSON a cargar (relativo a la raíz del repo)
 *   --paises=SE,NO,FI,DK        códigos ISO a incluir (default: SE,NO,FI,DK)
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib/safeCreate.cjs');

const DRY_RUN = !process.argv.includes('--execute');
const COLLECTION = 'housekeeping';

const ROOT = path.join(__dirname, '..');
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const FILE = path.join(ROOT, arg('file') || 'src/data/empresas-nuevas-housekeeping-nordicos.json');
const PAISES = new Set((arg('paises') || 'SE,NO,FI,DK').split(',').map(c => c.trim().toUpperCase()));

// Nombre de país (como viene en el JSON) -> código ISO, sacado de src/data/countries.js.
const COUNTRY = {};
const countriesSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'countries.js'), 'utf8');
for (const m of countriesSrc.matchAll(/code: '([A-Z]{2})', name: '([^']+)'/g)) {
  if (PAISES.has(m[1])) COUNTRY[m[2]] = m[1];
}

const { norm } = lib;

// Segundo filtro (la lista de Overture ya trae uno): variantes por país de los proveedores
// de email personal (hotmail.de, outlook.fr, yahoo.ro...) y nombres de alquiler particular
// compuestos (Gästezimmer, Appartementhaus...) que el primero dejaba pasar. Los chalets se
// quedan: en los Alpes muchos son chalets con personal que contratan para la temporada.
const PERSONAL = /^(gmail|googlemail|hotmail|outlook|live|windowslive|msn|yahoo|ymail|aol|icloud|me|mac|gmx|web|freenet|arcor|t-online|bluemail|bluewin|hispeed|sunrise|aon|chello|inode|proton|protonmail)\.(com|net|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const ALQUILER = /(zimmer|appartement|apartment|apartman|ferienwohn|ferienhaus|fewo|holiday home|casa vacanz)/;
const ESTABLECIMIENTO = /hotel|resort|hostel|lodge|\binn\b|motel|\bspa\b|gasthof|gasthaus|pension|albergo|jugendherberge/;
const descarte = e => {
  // Un hotel con email de hotmail o bluemail sigue siendo un hotel: se queda
  const nombre = norm(e.nombre);
  if (ESTABLECIMIENTO.test(nombre)) return null;
  if (PERSONAL.test(e.email.trim().toLowerCase().split('@')[1] || '')) return 'email personal';
  if (ALQUILER.test(nombre)) return 'alquiler particular';
  return null;
};

(async () => {
  const all = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const subset = all.filter(e => COUNTRY[e.pais]);
  console.log(`${path.relative(ROOT, FILE)}: ${all.length} · En ${[...PAISES].join(',')}: ${subset.length}`);

  const headers = lib.getHeaders();
  const before = await lib.fetchAll(COLLECTION, headers);
  const existing = lib.summarize(before);
  const maxId = Math.max(...existing.map(e => e.id));
  const byEmail = new Set(existing.map(e => e.email).filter(Boolean));
  const byName = new Set(existing.map(e => norm(e.name)));
  console.log(`Housekeeping existentes: ${existing.length} (maxId ${maxId})`);

  const skipped = [];
  const toCreate = [];
  const seenEmail = new Set(); // dedupe dentro del propio JSON filtrado
  let nextId = maxId + 1;
  const now = new Date().toISOString();

  const descartadas = {};
  for (const e of subset) {
    const motivo = descarte(e);
    if (motivo) { descartadas[motivo] = (descartadas[motivo] || 0) + 1; continue; }
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
  console.log('Descartadas por el filtro:', JSON.stringify(descartadas));
  skipped.slice(0, 20).forEach(s => console.log(`   skip: ${s}`));
  if (skipped.length > 20) console.log(`   ... y ${skipped.length - 20} más`);
  console.log('\nMuestra:');
  toCreate.slice(0, 5).forEach(c => console.log(`   ${c.id} ${c.name} <${c.email}> — ${c.location} [${c.country}]`));

  if (DRY_RUN) { console.log('\nDry-run: nada escrito. --execute para aplicar.'); return; }

  const toFields = c => ({
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
  });

  const backupFile = lib.writeBackup(COLLECTION, before);
  console.log(`\nBackup guardado: ${backupFile} (${before.length} docs)`);

  const { created, failed, createdItems } = await lib.createOnly(COLLECTION, toCreate, toFields, headers);

  console.log('\nVerificando que no se pisó nada...');
  const problems = await lib.verifyLight(COLLECTION, before, createdItems, toFields, headers);
  if (problems.length) {
    console.error(`VERIFICACIÓN FALLÓ (${problems.length} problemas). Backup: ${backupFile}`);
    problems.slice(0, 20).forEach(p => console.error('   ' + p));
    process.exit(1);
  }
  console.log(`Listo: ${created} creadas, ${failed} fallidas, ${skipped.length} salteadas. Los ${before.length} docs previos quedaron intactos.`);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
