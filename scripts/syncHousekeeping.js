/**
 * SCRIPT SEGURO para sincronizar housekeeping
 *
 * ⚠️  IMPORTANTE: Este script NUNCA modifica el campo 'status'
 *
 * Lo que hace:
 * 1. Lee los datos existentes de Firebase
 * 2. Compara con el JSON actualizado
 * 3. AGREGA solo las empresas nuevas (que no existen en Firebase)
 * 4. OPCIONALMENTE actualiza email/location/season de las existentes (SIN tocar status)
 *
 * Ejecutar con: node --experimental-json-modules scripts/syncHousekeeping.js
 *
 * Opciones:
 *   --dry-run     Solo muestra qué haría, sin hacer cambios (default)
 *   --execute     Ejecuta los cambios realmente
 *   --update-existing  También actualiza datos de empresas existentes (excepto status)
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, query, orderBy, writeBatch } from "firebase/firestore";
import housekeepingData from '../housekeeping.json' with { type: 'json' };

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyARQLA3ays6cDJbqlVv6uc4gyiWAM2o0S8",
  authDomain: "emails---trabajos.firebaseapp.com",
  projectId: "emails---trabajos",
  storageBucket: "emails---trabajos.firebasestorage.app",
  messagingSenderId: "577304335313",
  appId: "1:577304335313:web:657ed45bb98267a035c6f0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const UPDATE_EXISTING = args.includes('--update-existing');

// Country code helper (actualizada con más ubicaciones)
function getCountryCodeFromHousekeeping(location) {
  if (!location) return 'XX';
  const loc = location.toLowerCase();

  // Switzerland / Suiza
  if (loc.includes('suiza') || loc.includes('switzerland') || loc.includes('zermatt') ||
      loc.includes('verbier') || loc.includes('st. moritz') || loc.includes('ginebra') ||
      loc.includes('geneva') || loc.includes('basel')) return 'CH';

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

async function getExistingHousekeeping() {
  console.log('📖 Leyendo housekeeping existente de Firebase...');
  const housekeepingCol = collection(db, "housekeeping");
  const snapshot = await getDocs(query(housekeepingCol, orderBy("id")));
  const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
  console.log(`   Encontradas ${data.length} empresas en Firebase\n`);
  return data;
}

function normalizeNameForComparison(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function syncHousekeeping() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SYNC HOUSEKEEPING - Script Seguro');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (solo muestra, no hace cambios)' : '⚡ EXECUTE (hará cambios reales)'}`);
  console.log(`  Actualizar existentes: ${UPDATE_EXISTING ? 'Sí' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Get existing data
  const existingData = await getExistingHousekeeping();
  const existingByName = new Map();
  existingData.forEach(item => {
    existingByName.set(normalizeNameForComparison(item.name), item);
  });

  // 2. Process JSON data
  const jsonData = housekeepingData.map((item, index) => {
    const email = item["Email de Contacto"] || '';
    return {
      name: item["Nombre de la Empresa"] || '',
      email: email,
      emailVerified: email ? false : null,
      location: item["Ubicación"] || '',
      season: item["Temporada"] || '',
      country: getCountryCodeFromHousekeeping(item["Ubicación"]),
    };
  });

  console.log(`📊 JSON tiene ${jsonData.length} empresas\n`);

  // 3. Categorize: new vs existing
  const newItems = [];
  const toUpdate = [];
  const unchanged = [];

  jsonData.forEach((jsonItem) => {
    const normalizedName = normalizeNameForComparison(jsonItem.name);
    const existing = existingByName.get(normalizedName);

    if (!existing) {
      newItems.push(jsonItem);
    } else {
      // Check if anything changed (except status!)
      const changes = [];
      if (existing.email !== jsonItem.email) changes.push(`email: "${existing.email}" → "${jsonItem.email}"`);
      if (existing.location !== jsonItem.location) changes.push(`location: "${existing.location}" → "${jsonItem.location}"`);
      if (existing.season !== jsonItem.season) changes.push(`season: "${existing.season}" → "${jsonItem.season}"`);
      if (existing.country !== jsonItem.country) changes.push(`country: "${existing.country}" → "${jsonItem.country}"`);
      // Si el email cambió a uno con valor, y no había emailVerified, se inicializa como false
      if (jsonItem.email && existing.emailVerified === undefined) changes.push(`emailVerified: undefined → false`);

      if (changes.length > 0) {
        toUpdate.push({ existing, jsonItem, changes });
      } else {
        unchanged.push(existing);
      }
    }
  });

  // 4. Report
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESUMEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Sin cambios: ${unchanged.length}`);
  console.log(`  🆕 Nuevas para agregar: ${newItems.length}`);
  console.log(`  📝 Con datos actualizados: ${toUpdate.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Show new items
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

  // Show updates
  if (toUpdate.length > 0 && UPDATE_EXISTING) {
    console.log('📝 EMPRESAS A ACTUALIZAR (solo datos, NO status):');
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

  // 5. Execute changes if not dry run
  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO - No se hicieron cambios');
    console.log('  Para ejecutar realmente, usa: node scripts/syncHousekeeping.js --execute');
    if (!UPDATE_EXISTING && toUpdate.length > 0) {
      console.log('  Para también actualizar existentes, agrega: --update-existing');
    }
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  }

  // Execute for real
  console.log('⚡ EJECUTANDO CAMBIOS...\n');

  // Get max ID for new items
  const maxId = existingData.reduce((max, item) => Math.max(max, item.id || 0), 0);
  let nextId = maxId + 1;

  // Add new items
  if (newItems.length > 0) {
    console.log('Agregando empresas nuevas...');
    const batch = writeBatch(db);

    newItems.forEach((item) => {
      const newHousekeeping = {
        id: nextId,
        name: item.name,
        email: item.email,
        location: item.location,
        season: item.season,
        country: item.country,
        status: "Pending",
        notes: "",
        hidden: false
      };

      const docRef = doc(db, "housekeeping", nextId.toString());
      batch.set(docRef, newHousekeeping);
      console.log(`  ✅ Agregada: ${item.name} (ID: ${nextId})`);
      nextId++;
    });

    await batch.commit();
    console.log(`\n✅ ${newItems.length} empresas nuevas agregadas.\n`);
  }

  // Update existing (only non-status fields)
  if (UPDATE_EXISTING && toUpdate.length > 0) {
    console.log('Actualizando empresas existentes (SIN tocar status)...');

    for (const item of toUpdate) {
      const updates = {
        email: item.jsonItem.email,
        location: item.jsonItem.location,
        season: item.jsonItem.season,
        country: item.jsonItem.country,
        // Si hay email y el campo no existía, inicializar como false
        ...(item.jsonItem.email && item.existing.emailVerified === undefined
          ? { emailVerified: false }
          : {}),
        // ⚠️ NUNCA incluir status aquí!
      };

      const docRef = doc(db, "housekeeping", item.existing.id.toString());
      await updateDoc(docRef, updates);
      console.log(`  ✅ Actualizada: ${item.existing.name}`);
    }

    console.log(`\n✅ ${toUpdate.length} empresas actualizadas.\n`);
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
