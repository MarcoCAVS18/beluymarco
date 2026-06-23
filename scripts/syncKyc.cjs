/**
 * syncKyc.cjs — sincroniza la categoria KYC (remoto) a Firestore.
 *
 * SCRIPT SEGURO (mismas garantias que syncHousekeeping.cjs):
 * NUNCA modifica 'status', 'notes' ni 'hidden'. Matchea por NOMBRE.
 * Solo AGREGA empresas nuevas; con --update-existing actualiza datos (no status).
 *
 * Campos del kyc.json:
 *   Empresa | Email de Contacto | Link de Aplicacion | Segmento | Ubicacion | Pais
 *
 * Uso:
 *   node --env-file=.env scripts/syncKyc.cjs                              # dry-run
 *   node --env-file=.env scripts/syncKyc.cjs --execute                    # agrega nuevas
 *   node --env-file=.env scripts/syncKyc.cjs --execute --update-existing  # tambien actualiza datos
 */

const firebase = require('../node_modules/firebase/firebase-compat.js');
const kycData = require('../kyc.json');

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

function normalizeNameForComparison(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

async function syncKyc() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SYNC KYC - Script Seguro');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (solo muestra, no hace cambios)' : '⚡ EXECUTE (hará cambios reales)'}`);
  console.log(`  Actualizar existentes: ${UPDATE_EXISTING ? 'Sí' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📖 Leyendo KYC existente de Firebase...');
  const snapshot = await db.collection('kyc').get();
  const existingData = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }));
  console.log(`   Encontradas ${existingData.length} empresas en Firebase\n`);

  const existingByName = new Map();
  existingData.forEach(item => {
    existingByName.set(normalizeNameForComparison(item.name), item);
  });

  const jsonData = kycData
    .filter(item => item["Empresa"] && item["Empresa"].trim() !== '')
    .map(item => {
      const email = item["Email de Contacto"] || '';
      return {
        name: item["Empresa"],
        email,
        emailVerified: email ? false : null,
        applyUrl: item["Link de Aplicacion"] || '',
        segment: item["Segmento"] || '',
        location: item["Ubicacion"] || 'Remoto',
        country: item["Pais"] || 'XX',
      };
    });

  console.log(`📊 JSON tiene ${jsonData.length} empresas\n`);

  const newItems = [];
  const toUpdate = [];
  const unchanged = [];

  jsonData.forEach((jsonItem) => {
    const existing = existingByName.get(normalizeNameForComparison(jsonItem.name));
    if (!existing) {
      newItems.push(jsonItem);
    } else {
      const changes = [];
      if (jsonItem.email && existing.email !== jsonItem.email) changes.push(`email: "${existing.email}" → "${jsonItem.email}"`);
      if (jsonItem.applyUrl && existing.applyUrl !== jsonItem.applyUrl) changes.push(`applyUrl`);
      if (jsonItem.segment && existing.segment !== jsonItem.segment) changes.push(`segment`);
      if (jsonItem.location && existing.location !== jsonItem.location) changes.push(`location`);
      if (jsonItem.country && jsonItem.country !== 'XX' && existing.country === 'XX') changes.push(`country`);
      if (jsonItem.email && existing.emailVerified === undefined) changes.push(`emailVerified`);
      if (changes.length > 0) toUpdate.push({ existing, jsonItem, changes });
      else unchanged.push(existing);
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
    console.log('🆕 EMPRESAS KYC NUEVAS A AGREGAR:');
    console.log('────────────────────────────────────────');
    newItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name}  (${item.country})  [${item.segment}]`);
      console.log(`     📧 ${item.email || '(sin email)'}${item.applyUrl ? '   🔗 ' + item.applyUrl : ''}`);
    });
    console.log('');
  }

  if (toUpdate.length > 0 && !UPDATE_EXISTING) {
    console.log(`ℹ️  Hay ${toUpdate.length} empresas con datos diferentes, pero --update-existing no está activado.\n`);
  }

  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO - No se hicieron cambios');
    console.log('  Para ejecutar: node --env-file=.env scripts/syncKyc.cjs --execute');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  }

  console.log('⚡ EJECUTANDO CAMBIOS...\n');

  const maxId = existingData.reduce((max, item) => Math.max(max, item.id || 0), 0);
  let nextId = maxId + 1;

  if (newItems.length > 0) {
    let batch = db.batch();
    let batchCount = 0;
    for (const item of newItems) {
      const newKyc = {
        id: nextId,
        name: item.name,
        email: item.email,
        emailVerified: item.emailVerified,
        applyUrl: item.applyUrl,
        segment: item.segment,
        location: item.location,
        country: item.country,
        status: "Pending",
        notes: "",
        hidden: false,
        createdAt: firebase.firestore.Timestamp.now(),
      };
      batch.set(db.collection('kyc').doc(nextId.toString()), newKyc);
      console.log(`  ✅ Agregada: ${item.name} (ID: ${nextId})`);
      nextId++;
      batchCount++;
      if (batchCount >= 400) { await batch.commit(); batch = db.batch(); batchCount = 0; }
    }
    if (batchCount > 0) await batch.commit();
    console.log(`\n✅ ${newItems.length} empresas KYC nuevas agregadas.\n`);
  }

  if (UPDATE_EXISTING && toUpdate.length > 0) {
    for (const item of toUpdate) {
      const updates = {};
      if (item.jsonItem.email && item.existing.email !== item.jsonItem.email) updates.email = item.jsonItem.email;
      if (item.jsonItem.applyUrl && item.existing.applyUrl !== item.jsonItem.applyUrl) updates.applyUrl = item.jsonItem.applyUrl;
      if (item.jsonItem.segment && item.existing.segment !== item.jsonItem.segment) updates.segment = item.jsonItem.segment;
      if (item.jsonItem.location && item.existing.location !== item.jsonItem.location) updates.location = item.jsonItem.location;
      if (item.jsonItem.country && item.jsonItem.country !== 'XX' && item.existing.country === 'XX') updates.country = item.jsonItem.country;
      if (item.jsonItem.email && item.existing.emailVerified === undefined) updates.emailVerified = false;
      if (Object.keys(updates).length === 0) continue;
      await db.collection('kyc').doc(item.existing.id.toString()).update(updates);
      console.log(`  ✅ ${item.existing.name} (${Object.keys(updates).join(', ')})`);
    }
    console.log(`\n✅ Actualizaciones completadas.\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🎉 SINCRONIZACIÓN KYC COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(0);
}

syncKyc().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
