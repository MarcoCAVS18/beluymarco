/**
 * syncWineries.cjs — versión CommonJS (usa firebase-compat para Node 22).
 *
 * SCRIPT SEGURO para sincronizar wineries.
 * NUNCA modifica 'status', 'notes' ni 'hidden'.
 * NUNCA borra datos existentes con valores vacíos del JSON.
 *
 * Matchea por NOMBRE (no por índice de array), por lo que es resistente a
 * reordenamientos del csvjson.json.
 *
 * Uso:
 *   node --env-file=.env scripts/syncWineries.cjs                              # dry-run
 *   node --env-file=.env scripts/syncWineries.cjs --execute                    # agrega nuevas
 *   node --env-file=.env scripts/syncWineries.cjs --execute --update-existing  # también actualiza datos
 */

const firebase = require('../node_modules/firebase/firebase-compat.js');
const wineriesData = require('../csvjson.json');

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

function getCountryCode(location) {
  if (!location || location === '...') return 'XX';
  const l = location.toLowerCase();

  if (l.includes('australia') || l.includes('barossa') || l.includes('mclaren vale') ||
      l.includes('margaret river') || l.includes('hunter valley') || l.includes('yarra valley') ||
      l.includes('south australia') || l.includes('western australia') || l.includes('victoria') ||
      l.includes('new south wales') || l.includes('clare valley') || l.includes('coonawarra') ||
      l.includes('eden valley') || l.includes('nuriootpa') || l.includes('tanunda') ||
      l.includes('krondorf') || l.includes('angaston') || l.includes('keyneton') ||
      l.includes('bethany') || l.includes('seppeltsfield') || l.includes('marananga') ||
      l.includes('pokolbin') || l.includes('dixons creek') || l.includes('healesville') ||
      l.includes('gembrook') || l.includes('wilyabrup')) return 'AU';
  if (l.includes('nueva zelanda') || l.includes('new zealand') ||
      l.includes('canterbury') || l.includes('waipara') || l.includes('christchurch') ||
      l.includes('kumeu') || l.includes('auckland') || l.includes('marlborough') ||
      l.includes('blenheim') || l.includes('renwick') || l.includes('waiheke') ||
      l.includes('hawke') || l.includes('napier') || l.includes('hastings') ||
      l.includes('martinborough') || l.includes('wairarapa') || l.includes('otago') ||
      l.includes('queenstown') || l.includes('nelson') || l.includes('wanaka')) return 'NZ';
  if (l.includes('sudáfrica') || l.includes('south africa') || l.includes('stellenbosch') ||
      l.includes('franschhoek') || l.includes('western cape') || l.includes('constantia') ||
      l.includes('helderberg') || l.includes('simonsberg') || l.includes('koelenhof') ||
      l.includes('somerset west') || l.includes('paarl')) return 'ZA';
  if (l.includes('argentina') || l.includes('mendoza') || l.includes('luján de cuyo') ||
      l.includes('valle de uco') || l.includes('maipú') || l.includes('agrelo')) return 'AR';
  if (l.includes('chile') || l.includes('maipo') || l.includes('colchagua') ||
      l.includes('casablanca') || l.includes('aconcagua') || l.includes('pirque') ||
      l.includes('melipilla') || l.includes('panquehue') || l.includes('apalta')) return 'CL';
  if (l.includes('canadá') || l.includes('canada') || l.includes('okanagan') ||
      l.includes('british columbia') || l.includes('ontario') || l.includes('niagara') ||
      l.includes('kelowna') || l.includes('whistler') || l.includes('banff')) return 'CA';
  if (l.includes('alemania') || l.includes('germany') || l.includes('palatinado') ||
      l.includes('franconia') || l.includes('bayern') || l.includes('rheingau') ||
      l.includes('mosela') || l.includes('saar') || l.includes('württemberg') ||
      l.includes('hesse') || l.includes('rheinhessen') || l.includes('pfalz') ||
      l.includes('rheinland-pfalz') || l.includes('mosel')) return 'DE';
  if (l.includes('francia') || l.includes('france') || l.includes('burdeos') ||
      l.includes('bordeaux') || l.includes('aquitania') || l.includes('ródano') ||
      l.includes('rhone') || l.includes('borgoña') || l.includes('burgundy') ||
      l.includes('beaune') || l.includes('jura') || l.includes('hérault') ||
      l.includes('occitania') || l.includes('provenza') || l.includes('provence') ||
      l.includes('vaucluse') || l.includes('var') || l.includes('languedoc') ||
      l.includes('champagne') || l.includes('saboia') || l.includes('alsacia')) return 'FR';
  if (l.includes('italia') || l.includes('italy') || l.includes('toscana') ||
      l.includes('piamonte') || l.includes('piemonte') || l.includes('veneto') ||
      l.includes('sicilia') || l.includes('lombardía') || l.includes('trentino') ||
      l.includes('alto adige') || l.includes('umbria') || l.includes('montalcino') ||
      l.includes('bolgheri') || l.includes('chianti') || l.includes('barbaresco') ||
      l.includes('barolo') || l.includes('alba') || l.includes('firenze') ||
      l.includes('valpolicella') || l.includes('puglia') || l.includes('amalfi') ||
      l.includes('cerdeña') || l.includes('sardinia') || l.includes('san casciano')) return 'IT';
  if (l.includes('españa') || l.includes('spain') || l.includes('rioja') ||
      l.includes('ribera') || l.includes('priorat') || l.includes('cataluña') ||
      l.includes('penedès') || l.includes('galicia') || l.includes('navarra') ||
      l.includes('jerez') || l.includes('valladolid') || l.includes('burgos') ||
      l.includes('tarragona') || l.includes('barcelona') || l.includes('haro') ||
      l.includes('elciego') || l.includes('ollauri') || l.includes('peñafiel') ||
      l.includes('pesquera de duero')) return 'ES';
  if (l.includes('portugal') || l.includes('douro') || l.includes('alentejo') ||
      l.includes('dão') || l.includes('vinho verde') || l.includes('lisboa') ||
      l.includes('algarve')) return 'PT';
  if (l.includes('austria') || l.includes('österreich') || l.includes('wachau') ||
      l.includes('burgenland') || l.includes('kamptal') || l.includes('kremstal') ||
      l.includes('lech') || l.includes('ischgl') || l.includes('kitzbühel') ||
      l.includes('sölden') || l.includes('tirol')) return 'AT';
  if (l.includes('suiza') || l.includes('switzerland') || l.includes('schweiz') ||
      l.includes('valais') || l.includes('vaud') || l.includes('genève')) return 'CH';
  if (l.includes('grecia') || l.includes('greece') || l.includes('santorini') ||
      l.includes('creta') || l.includes('peloponeso') || l.includes('macedonia')) return 'GR';
  if (l.includes('hungría') || l.includes('hungary') || l.includes('tokaj')) return 'HU';
  if (l.includes('croacia') || l.includes('croatia') || l.includes('istria') ||
      l.includes('dalmacia') || l.includes('dubrovnik') || l.includes('split')) return 'HR';
  if (l.includes('eslovenia') || l.includes('slovenia')) return 'SI';
  if (l.includes('checa') || l.includes('czech') || l.includes('moravia')) return 'CZ';
  if (l.includes('bulgaria')) return 'BG';
  if (l.includes('rumanía') || l.includes('romania')) return 'RO';
  if (l.includes('georgia') || l.includes('kakheti')) return 'GE';
  if (l.includes('chipre') || l.includes('cyprus')) return 'CY';
  if (l.includes('luxemburgo') || l.includes('luxembourg')) return 'LU';
  if (l.includes('usa') || l.includes('california') || l.includes('washington') ||
      l.includes('oregon') || l.includes('oregón') || l.includes('virginia') ||
      l.includes('missouri') || l.includes('wisconsin') || l.includes('napa') ||
      l.includes('sonoma') || l.includes('estados unidos')) return 'US';
  return 'XX';
}

function normalizeNameForComparison(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

async function syncWineries() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SYNC WINERIES - Script Seguro');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (solo muestra, no hace cambios)' : '⚡ EXECUTE (hará cambios reales)'}`);
  console.log(`  Actualizar existentes: ${UPDATE_EXISTING ? 'Sí' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📖 Leyendo wineries existentes de Firebase...');
  const snapshot = await db.collection('wineries').get();
  const existingData = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
  console.log(`   Encontradas ${existingData.length} bodegas en Firebase\n`);

  const existingByName = new Map();
  existingData.forEach(item => {
    existingByName.set(normalizeNameForComparison(item.name), item);
  });

  const jsonData = wineriesData
    .filter(item => item["Bodega (Weingut)"] && item["Bodega (Weingut)"] !== '...' && item["Bodega (Weingut)"].trim() !== '')
    .map(item => {
      let email = item["Email de contacto"] || '';
      let harvestStart = item["Inicio de vendimia"] || '';
      if (email === '' && harvestStart && harvestStart.includes('@')) {
        email = harvestStart;
        harvestStart = 'TBD';
      }
      return {
        name: item["Bodega (Weingut)"],
        email,
        emailVerified: email ? false : null,
        location: item["Ubicación"] || '',
        harvestStart,
        country: getCountryCode(item["Ubicación"]),
      };
    });

  console.log(`📊 JSON tiene ${jsonData.length} bodegas\n`);

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
      if (jsonItem.harvestStart && existing.harvestStart !== jsonItem.harvestStart) changes.push(`harvestStart: "${existing.harvestStart}" → "${jsonItem.harvestStart}"`);
      // Solo actualiza country si el existente es XX (desconocido). Nunca pisa un país válido,
      // así un falso positivo del detector (ej: "Tavarnelle" matcheando 'var' como Francia)
      // no sobreescribe un código correcto que ya está en Firestore.
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

  if (newItems.length > 0 && newItems.length <= 50) {
    console.log('🆕 BODEGAS NUEVAS A AGREGAR:');
    console.log('────────────────────────────────────────');
    newItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name}`);
      console.log(`     📍 ${item.location} (${item.country})`);
      console.log(`     📧 ${item.email || '(sin email)'}`);
    });
    console.log('');
  } else if (newItems.length > 50) {
    console.log(`🆕 BODEGAS NUEVAS A AGREGAR (${newItems.length} en total, mostrando primeras 20):`);
    console.log('────────────────────────────────────────');
    newItems.slice(0, 20).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} — ${item.location} (${item.country})`);
    });
    console.log(`  ... y ${newItems.length - 20} más`);
    console.log('');
  }

  if (toUpdate.length > 0 && UPDATE_EXISTING && toUpdate.length <= 50) {
    console.log('📝 BODEGAS A ACTUALIZAR (solo datos, NO status/notes/hidden):');
    console.log('────────────────────────────────────────');
    toUpdate.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.existing.name} (ID: ${item.existing.id})`);
      console.log(`     ⚠️  Status actual: "${item.existing.status}" - NO SE TOCARÁ`);
      item.changes.forEach(change => {
        console.log(`     → ${change}`);
      });
    });
    console.log('');
  } else if (toUpdate.length > 50 && UPDATE_EXISTING) {
    console.log(`📝 BODEGAS A ACTUALIZAR (${toUpdate.length} en total, mostrando primeras 10):`);
    console.log('────────────────────────────────────────');
    toUpdate.slice(0, 10).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.existing.name} → ${item.changes.join(', ')}`);
    });
    console.log(`  ... y ${toUpdate.length - 10} más`);
    console.log('');
  } else if (toUpdate.length > 0 && !UPDATE_EXISTING) {
    console.log(`ℹ️  Hay ${toUpdate.length} bodegas con datos diferentes, pero --update-existing no está activado.\n`);
  }

  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO - No se hicieron cambios');
    console.log('  Para ejecutar: node --env-file=.env scripts/syncWineries.cjs --execute');
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
    console.log('Agregando bodegas nuevas...');
    const batch = db.batch();
    let batchCount = 0;
    let committedTotal = 0;

    for (const item of newItems) {
      const newWinery = {
        id: nextId,
        name: item.name,
        email: item.email,
        emailVerified: item.emailVerified,
        location: item.location,
        harvestStart: item.harvestStart,
        country: item.country,
        status: "Pending",
        notes: "",
        hidden: false,
      };
      batch.set(db.collection('wineries').doc(nextId.toString()), newWinery);
      console.log(`  ✅ Agregada: ${item.name} (ID: ${nextId})`);
      nextId++;
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        committedTotal += batchCount;
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    console.log(`\n✅ ${newItems.length} bodegas nuevas agregadas.\n`);
  }

  if (UPDATE_EXISTING && toUpdate.length > 0) {
    console.log('Actualizando bodegas existentes (SIN tocar status/notes/hidden)...');

    for (const item of toUpdate) {
      const updates = {};
      if (item.jsonItem.email && item.existing.email !== item.jsonItem.email) updates.email = item.jsonItem.email;
      if (item.jsonItem.location && item.existing.location !== item.jsonItem.location) updates.location = item.jsonItem.location;
      if (item.jsonItem.harvestStart && item.existing.harvestStart !== item.jsonItem.harvestStart) updates.harvestStart = item.jsonItem.harvestStart;
      if (item.jsonItem.country && item.jsonItem.country !== 'XX' && item.existing.country === 'XX') updates.country = item.jsonItem.country;
      if (item.jsonItem.email && item.existing.emailVerified === undefined) updates.emailVerified = false;
      if (Object.keys(updates).length === 0) continue;

      await db.collection('wineries').doc(item.existing.id.toString()).update(updates);
      console.log(`  ✅ ${item.existing.name} (${Object.keys(updates).join(', ')})`);
    }

    console.log(`\n✅ Actualizaciones completadas.\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🎉 SINCRONIZACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(0);
}

syncWineries().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
