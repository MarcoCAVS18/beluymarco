/**
 * syncHousekeeping.cjs — versión CommonJS (usa firebase-compat para Node 22).
 *
 * SCRIPT SEGURO para sincronizar housekeeping.
 * NUNCA modifica 'status', 'notes' ni 'hidden'.
 * NUNCA borra datos existentes ni los pisa con valores vacíos del JSON.
 *
 * Matchea por NOMBRE (no por índice de array), por lo que es resistente a
 * reordenamientos del housekeeping.json.
 *
 * Uso:
 *   node --env-file=.env scripts/syncHousekeeping.cjs                              # dry-run
 *   node --env-file=.env scripts/syncHousekeeping.cjs --execute                    # agrega nuevas
 *   node --env-file=.env scripts/syncHousekeeping.cjs --execute --update-existing  # también actualiza datos
 */

const firebase = require('../node_modules/firebase/firebase-compat.js');
const housekeepingData = require('../housekeeping.json');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const UPDATE_EXISTING = args.includes('--update-existing');
// Modo backfill: estampa createdAt (= ahora) en docs que NO lo tengan y cuyo id sea >= --from-id.
// Sirve para que empresas agregadas antes de existir el campo muestren el badge "NEW".
const BACKFILL_CREATEDAT = args.includes('--backfill-createdat');
const fromIdArg = args.find(a => a.startsWith('--from-id='));
const FROM_ID = fromIdArg ? parseInt(fromIdArg.split('=')[1], 10) : 0;

function getCountryCodeFromHousekeeping(location) {
  if (!location) return 'XX';
  const loc = location.toLowerCase();

  // Andorra
  if (loc.includes('andorra') || loc.includes('soldeu') || loc.includes('el tarter') ||
      loc.includes('pas de la casa') || loc.includes('grau roig') || loc.includes('arinsal') ||
      loc.includes('la massana') || loc.includes('ordino') || loc.includes('canillo') ||
      loc.includes('encamp') || loc.includes('escaldes') || loc.includes('sant julià') ||
      loc.includes('el serrat') || loc.includes('erts')) return 'AD';

  // Switzerland / Suiza
  if (loc.includes('suiza') || loc.includes('switzerland') || loc.includes('zermatt') ||
      loc.includes('verbier') || loc.includes('st. moritz') || loc.includes('ginebra') ||
      loc.includes('geneva') || loc.includes('basel') || loc.includes('gstaad') ||
      loc.includes('saas-fee') || loc.includes('crans-montana') || loc.includes('grindelwald') ||
      loc.includes('wengen') || loc.includes('mürren') || loc.includes('klosters') ||
      loc.includes('davos') || loc.includes('laax') || loc.includes('flims') ||
      loc.includes('adelboden') || loc.includes('leukerbad') || loc.includes('villars') ||
      loc.includes('champéry') || loc.includes('nendaz') || loc.includes('engelberg')) return 'CH';

  // France / Francia
  if (loc.includes('francia') || loc.includes('france') || loc.includes('courchevel') ||
      loc.includes('chamonix') || loc.includes('val thorens') || loc.includes('val d\'isère') ||
      loc.includes('méribel') || loc.includes('morzine') || loc.includes('tignes') ||
      loc.includes('avoriaz') || loc.includes('la plagne') || loc.includes('les gets') ||
      loc.includes('alpes franceses') || loc.includes('marne-la-vallée')) return 'FR';

  // Austria
  if (loc.includes('austria') || loc.includes('st. anton') || loc.includes('lech') ||
      loc.includes('zürs') || loc.includes('ischgl') || loc.includes('kitzbühel') ||
      loc.includes('saalbach') || loc.includes('warth') || loc.includes('arlberg') ||
      loc.includes('landeck')) return 'AT';

  // Italy / Italia
  if (loc.includes('italia') || loc.includes('italy') || loc.includes('cortina') ||
      loc.includes('val gardena') || loc.includes('cerdeña') || loc.includes('sardinia') ||
      loc.includes('dolomitas') || loc.includes('génova') || loc.includes('selva')) return 'IT';

  // Spain / España
  if (loc.includes('españa') || loc.includes('spain') || loc.includes('mallorca') ||
      loc.includes('ibiza') || loc.includes('lanzarote') || loc.includes('costa del sol') ||
      loc.includes('baleares') || loc.includes('canarias')) return 'ES';

  // Greece / Grecia
  if (loc.includes('grecia') || loc.includes('greece') || loc.includes('santorini') ||
      loc.includes('mykonos') || loc.includes('halkidiki') || loc.includes('corfú') ||
      loc.includes('chipre') || loc.includes('cyprus')) return 'GR';

  // Portugal
  if (loc.includes('portugal') || loc.includes('algarve') || loc.includes('lisboa') ||
      loc.includes('lisbon') || loc.includes('madeira')) return 'PT';

  // Sweden / Suecia
  if (loc.includes('suecia') || loc.includes('sweden') || loc.includes('åre') ||
      loc.includes('sälen') || loc.includes('jukkasjärvi') || loc.includes('halmstad') ||
      loc.includes('strömstad') || loc.includes('visby') || loc.includes('gotland') ||
      loc.includes('riksgränsen')) return 'SE';

  // Finland / Finlandia
  if (loc.includes('finlandia') || loc.includes('finland') || loc.includes('rovaniemi') ||
      loc.includes('saariselkä') || loc.includes('levi') || loc.includes('ylläs') ||
      loc.includes('ruka') || loc.includes('köngäs')) return 'FI';

  // Norway / Noruega
  if (loc.includes('noruega') || loc.includes('norway') || loc.includes('trysil') ||
      loc.includes('hemsedal') || loc.includes('lofoten') || loc.includes('larvik') ||
      loc.includes('geiranger') || loc.includes('lofthus') || loc.includes('voss') ||
      loc.includes('flåm') || loc.includes('lyngen') || loc.includes('troms') ||
      loc.includes('alta') || loc.includes('kirkenes') || loc.includes('sognefjord')) return 'NO';

  // Iceland / Islandia
  if (loc.includes('islandia') || loc.includes('iceland') || loc.includes('höfn')) return 'IS';

  // Canada / Canadá
  if (loc.includes('canadá') || loc.includes('canada') || loc.includes('british columbia') ||
      loc.includes('whistler') || loc.includes('banff') || loc.includes('lake louise') ||
      loc.includes('sun peaks') || loc.includes('panorama') || loc.includes('revelstoke') ||
      loc.includes('fernie') || loc.includes('alberta') || loc.includes('tofino') ||
      loc.includes('fogo island')) return 'CA';

  // Denmark / Dinamarca
  if (loc.includes('dinamarca') || loc.includes('denmark') || loc.includes('skagen') ||
      loc.includes('copenhague') || loc.includes('copenhagen') || loc.includes('zealand')) return 'DK';

  // Germany / Alemania
  if (loc.includes('alemania') || loc.includes('germany') || loc.includes('hamburg') ||
      loc.includes('garmisch') || loc.includes('bavaria') || loc.includes('grainau')) return 'DE';

  // Croatia / Croacia
  if (loc.includes('croacia') || loc.includes('croatia') || loc.includes('poreč') ||
      loc.includes('dubrovnik')) return 'HR';

  // Netherlands / Países Bajos
  if (loc.includes('países bajos') || loc.includes('netherlands') || loc.includes('holanda')) return 'NL';

  // Belgium / Bélgica
  if (loc.includes('bélgica') || loc.includes('belgium')) return 'BE';

  // Ireland / Irlanda
  if (loc.includes('irlanda') || loc.includes('ireland') || loc.includes('longford')) return 'IE';

  // UK / Reino Unido
  if (loc.includes('reino unido') || loc.includes('uk') || loc.includes('united kingdom') ||
      loc.includes('scottish') || loc.includes('highlands') || loc.includes('villages, reino')) return 'GB';

  // USA
  if (loc.includes('usa') || loc.includes('california') || loc.includes('florida') ||
      loc.includes('alaska') || loc.includes('wyoming') || loc.includes('arizona') ||
      loc.includes('montana') || loc.includes('colorado') || loc.includes('miami')) return 'US';

  // Multiple/International
  if (loc.includes('nórdicos') || loc.includes('europa') || loc.includes('internacional') ||
      loc.includes('múltiples') || loc.includes('80+ países') || loc.includes('14 países') ||
      loc.includes('150+ resorts')) return 'GB'; // Default to GB for international

  return 'XX';
}

function normalizeNameForComparison(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

async function backfillCreatedAt() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BACKFILL createdAt - Script Seguro');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTE'}  |  from-id: ${FROM_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const snapshot = await db.collection('housekeeping').get();
  const all = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
  const targets = all.filter(item => (item.id || 0) >= FROM_ID && !item.createdAt);

  console.log(`📊 ${all.length} empresas en Firebase. ${targets.length} sin createdAt con id >= ${FROM_ID}.\n`);
  targets.forEach(t => console.log(`  • ${t.name} (ID: ${t.id})`));
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no se hicieron cambios.');
    console.log('Para ejecutar: node --env-file=.env scripts/syncHousekeeping.cjs --backfill-createdat --from-id=' + FROM_ID + ' --execute');
    process.exit(0);
  }

  const now = firebase.firestore.Timestamp.now();
  for (const t of targets) {
    // Solo agrega createdAt; nunca toca status/notes/hidden ni ningún otro campo.
    await db.collection('housekeeping').doc(t.id.toString()).update({ createdAt: now });
    console.log(`  ✅ createdAt seteado: ${t.name} (ID: ${t.id})`);
  }
  console.log(`\n✅ ${targets.length} empresas actualizadas con createdAt.`);
  process.exit(0);
}

async function syncHousekeeping() {
  if (BACKFILL_CREATEDAT) return backfillCreatedAt();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SYNC HOUSEKEEPING - Script Seguro');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (solo muestra, no hace cambios)' : '⚡ EXECUTE (hará cambios reales)'}`);
  console.log(`  Actualizar existentes: ${UPDATE_EXISTING ? 'Sí' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📖 Leyendo housekeeping existente de Firebase...');
  const snapshot = await db.collection('housekeeping').get();
  const existingData = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
  console.log(`   Encontradas ${existingData.length} empresas en Firebase\n`);

  const existingByName = new Map();
  existingData.forEach(item => {
    existingByName.set(normalizeNameForComparison(item.name), item);
  });

  const jsonData = housekeepingData
    .filter(item => item["Nombre de la Empresa"] && item["Nombre de la Empresa"].trim() !== '')
    .map(item => {
      const email = item["Email de Contacto"] || '';
      return {
        name: item["Nombre de la Empresa"],
        email,
        emailVerified: email ? false : null,
        location: item["Ubicación"] || '',
        season: item["Temporada"] || '',
        country: getCountryCodeFromHousekeeping(item["Ubicación"]),
      };
    });

  console.log(`📊 JSON tiene ${jsonData.length} empresas\n`);

  const newItems = [];
  const toUpdate = [];
  const unchanged = [];

  jsonData.forEach((jsonItem) => {
    const normalizedName = normalizeNameForComparison(jsonItem.name);
    const existing = existingByName.get(normalizedName);

    if (!existing) {
      newItems.push(jsonItem);
    } else {
      const changes = [];
      if (jsonItem.email && existing.email !== jsonItem.email) changes.push(`email: "${existing.email}" → "${jsonItem.email}"`);
      if (jsonItem.location && existing.location !== jsonItem.location) changes.push(`location: "${existing.location}" → "${jsonItem.location}"`);
      if (jsonItem.season && existing.season !== jsonItem.season) changes.push(`season: "${existing.season}" → "${jsonItem.season}"`);
      // Solo actualiza country si el existente es XX (desconocido). Nunca pisa un código válido.
      if (jsonItem.country && jsonItem.country !== 'XX' && existing.country === 'XX') changes.push(`country: "${existing.country}" → "${jsonItem.country}"`);
      if (jsonItem.email && existing.emailVerified === undefined) changes.push(`emailVerified: undefined → false`);

      if (changes.length > 0) {
        toUpdate.push({ existing, jsonItem, changes });
      } else {
        unchanged.push(existing);
      }
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESUMEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Sin cambios: ${unchanged.length}`);
  console.log(`  🆕 Nuevas para agregar: ${newItems.length}`);
  console.log(`  📝 Con datos actualizados: ${toUpdate.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (newItems.length > 0) {
    console.log('🆕 EMPRESAS NUEVAS A AGREGAR:');
    console.log('────────────────────────────────────────');
    newItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name}`);
      console.log(`     📍 ${item.location} (${item.country})`);
      console.log(`     📧 ${item.email || '(sin email)'}`);
      console.log(`     🗓️  ${item.season}`);
    });
    console.log('');
  }

  if (toUpdate.length > 0 && UPDATE_EXISTING) {
    console.log('📝 EMPRESAS A ACTUALIZAR (solo datos, NO status/notes/hidden):');
    console.log('────────────────────────────────────────');
    toUpdate.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.existing.name} (ID: ${item.existing.id})`);
      console.log(`     ⚠️  Status actual: "${item.existing.status}" - NO SE TOCARÁ`);
      item.changes.forEach(change => {
        console.log(`     → ${change}`);
      });
    });
    console.log('');
  } else if (toUpdate.length > 0 && !UPDATE_EXISTING) {
    console.log(`ℹ️  Hay ${toUpdate.length} empresas con datos diferentes, pero --update-existing no está activado.\n`);
  }

  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO - No se hicieron cambios');
    console.log('  Para ejecutar: node --env-file=.env scripts/syncHousekeeping.cjs --execute');
    if (!UPDATE_EXISTING && toUpdate.length > 0) {
      console.log('  Para también actualizar existentes, agregá: --update-existing');
    }
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  }

  console.log('⚡ EJECUTANDO CAMBIOS...\n');

  const maxId = existingData.reduce((max, item) => Math.max(max, item.id || 0), 0);
  let nextId = maxId + 1;

  if (newItems.length > 0) {
    console.log('Agregando empresas nuevas...');
    let batch = db.batch();
    let batchCount = 0;

    for (const item of newItems) {
      const newHousekeeping = {
        id: nextId,
        name: item.name,
        email: item.email,
        emailVerified: item.emailVerified,
        location: item.location,
        season: item.season,
        country: item.country,
        status: "Pending",
        notes: "",
        hidden: false,
        // Marca temporal para el badge "NEW" en la app (se auto-expira por días).
        createdAt: firebase.firestore.Timestamp.now(),
      };
      batch.set(db.collection('housekeeping').doc(nextId.toString()), newHousekeeping);
      console.log(`  ✅ Agregada: ${item.name} (ID: ${nextId})`);
      nextId++;
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    console.log(`\n✅ ${newItems.length} empresas nuevas agregadas.\n`);
  }

  if (UPDATE_EXISTING && toUpdate.length > 0) {
    console.log('Actualizando empresas existentes (SIN tocar status/notes/hidden)...');

    for (const item of toUpdate) {
      const updates = {};
      if (item.jsonItem.email && item.existing.email !== item.jsonItem.email) updates.email = item.jsonItem.email;
      if (item.jsonItem.location && item.existing.location !== item.jsonItem.location) updates.location = item.jsonItem.location;
      if (item.jsonItem.season && item.existing.season !== item.jsonItem.season) updates.season = item.jsonItem.season;
      if (item.jsonItem.country && item.jsonItem.country !== 'XX' && item.existing.country === 'XX') updates.country = item.jsonItem.country;
      if (item.jsonItem.email && item.existing.emailVerified === undefined) updates.emailVerified = false;
      if (Object.keys(updates).length === 0) continue;

      await db.collection('housekeeping').doc(item.existing.id.toString()).update(updates);
      console.log(`  ✅ ${item.existing.name} (${Object.keys(updates).join(', ')})`);
    }

    console.log(`\n✅ Actualizaciones completadas.\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🎉 SINCRONIZACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(0);
}

syncHousekeeping().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
