/**
 * restoreLostEmails.cjs — versión CommonJS (usa firebase-compat para Node 22).
 *
 * Restaura emails que se perdieron al actualizar csvjson.json en el commit 9f3750a.
 * Compara nombres entre _recovered_wineries_a1c4003.json y los documentos actuales
 * en Firestore. Si la bodega existe en ambos y en Firestore tiene email vacío
 * pero en el snapshot tenía email, lo restaura.
 *
 * Solo escribe 'email' (y 'emailVerified: false' si faltaba).
 * NUNCA toca status, notes, hidden, location, harvestStart ni country.
 *
 * Uso:
 *   node --env-file=.env scripts/restoreLostEmails.cjs              # dry-run
 *   node --env-file=.env scripts/restoreLostEmails.cjs --execute    # ejecuta
 */

const firebase = require('../node_modules/firebase/firebase-compat.js');
const oldData = require('./_recovered_wineries_a1c4003.json');

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

const DRY_RUN = !process.argv.includes('--execute');

const norm = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

function getEmailFromOld(item) {
  let email = item['Email de contacto'] || '';
  const harvestStart = item['Inicio de vendimia'] || '';
  if (email === '' && harvestStart && harvestStart.includes('@')) email = harvestStart;
  return email.trim();
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RESTORE LOST EMAILS — bodegas comunes con email perdido');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY RUN (no escribe)' : '⚡ EXECUTE'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const oldEmailByName = new Map();
  oldData.forEach(w => {
    const name = norm(w['Bodega (Weingut)']);
    const email = getEmailFromOld(w);
    if (name && email) oldEmailByName.set(name, email);
  });
  console.log(`📖 Snapshot anterior: ${oldEmailByName.size} bodegas con email\n`);

  console.log('📖 Leyendo wineries de Firebase...');
  const snap = await db.collection('wineries').get();
  console.log(`   Encontrados ${snap.size} documentos\n`);

  const toRestore = [];
  snap.docs.forEach(d => {
    const data = d.data();
    const name = norm(data.name);
    const oldEmail = oldEmailByName.get(name);
    if (!oldEmail) return;
    const currentEmail = (data.email || '').trim();
    if (!currentEmail) {
      toRestore.push({
        docId: d.id,
        name: data.name,
        restoreEmail: oldEmail,
        needsVerifiedFlag: data.emailVerified === undefined,
      });
    }
  });

  console.log(`🔧 A restaurar: ${toRestore.length} emails\n`);
  if (toRestore.length === 0) {
    console.log('✅ Nada que restaurar.');
    process.exit(0);
  }

  toRestore.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} (doc ${t.docId})`);
    console.log(`     → email: "${t.restoreEmail}"${t.needsVerifiedFlag ? ' (+ emailVerified: false)' : ''}`);
  });

  if (DRY_RUN) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🔍 DRY RUN COMPLETADO — no se escribió nada');
    console.log('  Para ejecutar: node --env-file=.env scripts/restoreLostEmails.cjs --execute');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  }

  console.log('\n⚡ EJECUTANDO...\n');
  for (const t of toRestore) {
    const updates = { email: t.restoreEmail };
    if (t.needsVerifiedFlag) updates.emailVerified = false;
    await db.collection('wineries').doc(t.docId).update(updates);
    console.log(`  ✅ ${t.name}`);
  }

  console.log(`\n✅ ${toRestore.length} emails restaurados.`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
