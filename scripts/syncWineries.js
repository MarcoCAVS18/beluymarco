/**
 * SCRIPT SEGURO para sincronizar wineries
 *
 * ⚠️  IMPORTANTE: Este script NUNCA modifica los campos 'status', 'notes' ni 'hidden'
 *
 * Lo que hace:
 * 1. Lee los datos existentes de Firebase (matching por NOMBRE, no por índice)
 * 2. Compara con csvjson.json actualizado
 * 3. AGREGA solo las bodegas nuevas (que no existen en Firebase)
 * 4. OPCIONALMENTE actualiza email/location/harvestStart/country de las existentes
 *    (SIN tocar status/notes/hidden)
 *
 * Ejecutar con (cargando variables de .env):
 *   node --env-file=.env scripts/syncWineries.js               # dry-run (default)
 *   node --env-file=.env scripts/syncWineries.js --execute     # ejecuta cambios
 *   node --env-file=.env scripts/syncWineries.js --execute --update-existing
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, updateDoc, query, orderBy, writeBatch } from "firebase/firestore";
import wineriesData from '../csvjson.json' with { type: 'json' };

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function getExistingWineries() {
  console.log('📖 Leyendo wineries existentes de Firebase...');
  const wineriesCol = collection(db, "wineries");
  const snapshot = await getDocs(query(wineriesCol, orderBy("id")));
  const data = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
  console.log(`   Encontradas ${data.length} bodegas en Firebase\n`);
  return data;
}

async function syncWineries() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SYNC WINERIES - Script Seguro');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (solo muestra, no hace cambios)' : '⚡ EXECUTE (hará cambios reales)'}`);
  console.log(`  Actualizar existentes: ${UPDATE_EXISTING ? 'Sí' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const existingData = await getExistingWineries();
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
      // Solo proponemos cambio cuando el JSON tiene un valor NO vacío que difiere del actual.
      // Nunca borramos datos existentes con vacíos del JSON.
      const changes = [];
      if (jsonItem.email && existing.email !== jsonItem.email) changes.push(`email: "${existing.email}" → "${jsonItem.email}"`);
      if (jsonItem.location && existing.location !== jsonItem.location) changes.push(`location: "${existing.location}" → "${jsonItem.location}"`);
      if (jsonItem.harvestStart && existing.harvestStart !== jsonItem.harvestStart) changes.push(`harvestStart: "${existing.harvestStart}" → "${jsonItem.harvestStart}"`);
      if (jsonItem.country && jsonItem.country !== 'XX' && existing.country !== jsonItem.country) changes.push(`country: "${existing.country}" → "${jsonItem.country}"`);
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
    console.log('🆕 BODEGAS NUEVAS A AGREGAR:');
    console.log('────────────────────────────────────────');
    newItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name}`);
      console.log(`     📍 ${item.location} (${item.country})`);
      console.log(`     📧 ${item.email || '(sin email)'}`);
      console.log(`     🍇 Vendimia: ${item.harvestStart || '(sin fecha)'}`);
    });
    console.log('');
  }

  if (toUpdate.length > 0 && UPDATE_EXISTING) {
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
  } else if (toUpdate.length > 0 && !UPDATE_EXISTING) {
    console.log(`ℹ️  Hay ${toUpdate.length} bodegas con datos diferentes, pero --update-existing no está activado.\n`);
  }

  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO - No se hicieron cambios');
    console.log('  Para ejecutar realmente: node --env-file=.env scripts/syncWineries.js --execute');
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
    const batch = writeBatch(db);

    newItems.forEach((item) => {
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
        hidden: false
      };

      const docRef = doc(db, "wineries", nextId.toString());
      batch.set(docRef, newWinery);
      console.log(`  ✅ Agregada: ${item.name} (ID: ${nextId})`);
      nextId++;
    });

    await batch.commit();
    console.log(`\n✅ ${newItems.length} bodegas nuevas agregadas.\n`);
  }

  if (UPDATE_EXISTING && toUpdate.length > 0) {
    console.log('Actualizando bodegas existentes (SIN tocar status/notes/hidden)...');

    for (const item of toUpdate) {
      // Solo escribimos campos con valor real. Nunca pisamos un dato existente con vacío.
      const updates = {};
      if (item.jsonItem.email && item.existing.email !== item.jsonItem.email) updates.email = item.jsonItem.email;
      if (item.jsonItem.location && item.existing.location !== item.jsonItem.location) updates.location = item.jsonItem.location;
      if (item.jsonItem.harvestStart && item.existing.harvestStart !== item.jsonItem.harvestStart) updates.harvestStart = item.jsonItem.harvestStart;
      if (item.jsonItem.country && item.jsonItem.country !== 'XX' && item.existing.country !== item.jsonItem.country) updates.country = item.jsonItem.country;
      if (item.jsonItem.email && item.existing.emailVerified === undefined) updates.emailVerified = false;
      // ⚠️ NUNCA incluir status, notes ni hidden acá!

      if (Object.keys(updates).length === 0) continue;

      const docRef = doc(db, "wineries", item.existing.id.toString());
      await updateDoc(docRef, updates);
      console.log(`  ✅ Actualizada: ${item.existing.name} (${Object.keys(updates).join(', ')})`);
    }

    console.log(`\n✅ ${toUpdate.length} bodegas actualizadas.\n`);
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
