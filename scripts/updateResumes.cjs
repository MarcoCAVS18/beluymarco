/**
 * updateResumes.cjs — versión CommonJS (usa firebase-compat para Node 22).
 *
 * SCRIPT SEGURO para actualizar los resumes de Housekeeping en config/app.
 * NUNCA toca otros campos del documento (flags, statusOptions, coverLetters, etc).
 * Lee el array `resumes` actual y solo reemplaza las entradas de Housekeeping;
 * las de Winery (y cualquier otra) quedan exactamente como están.
 *
 * Uso:
 *   node --env-file=.env scripts/updateResumes.cjs            # dry-run
 *   node --env-file=.env scripts/updateResumes.cjs --execute  # aplica
 */

const fs = require('fs');
const path = require('path');
const firebase = require('../node_modules/firebase/firebase-compat.js');

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

// Nombres nuevos (July 2026). Ojo: el de Belu es SIN "copia".
const NEW_HK_RESUMES = {
  Belu: 'Resume HK - July 2026 - Maria Belen Corzo.pdf',
  Marco: 'Resume HK - July 2026 - Marco Piermatei.pdf',
};

async function main() {
  // Verificar que los PDFs nuevos existan en public/resumes antes de tocar nada
  for (const file of Object.values(NEW_HK_RESUMES)) {
    const fullPath = path.join(__dirname, '..', 'public', 'resumes', file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ No existe public/resumes/${file} — abortando sin tocar Firestore.`);
      process.exit(1);
    }
  }

  const configRef = db.collection('config').doc('app');
  const snap = await configRef.get();
  if (!snap.exists) {
    console.error('❌ No existe el documento config/app — abortando.');
    process.exit(1);
  }

  const current = snap.data().resumes || [];
  console.log('📄 Resumes actuales en Firestore:');
  current.forEach(r => console.log(`   [${r.id}] ${r.type} / ${r.person}: ${r.file}`));

  const updated = current.map(r => {
    if (r.type === 'Housekeeping' && NEW_HK_RESUMES[r.person]) {
      const file = NEW_HK_RESUMES[r.person];
      return { ...r, file, path: `/resumes/${file}` };
    }
    return r; // Winery y cualquier otra entrada quedan intactas
  });

  const changed = updated.filter((r, i) => r.file !== current[i].file);
  if (changed.length === 0) {
    console.log('✅ Firestore ya está al día, nada para cambiar.');
    process.exit(0);
  }

  console.log('\n🔁 Cambios a aplicar:');
  changed.forEach(r => console.log(`   [${r.id}] ${r.type} / ${r.person} → ${r.file}`));

  if (DRY_RUN) {
    console.log('\n🔍 Dry-run: no se escribió nada. Corré con --execute para aplicar.');
    process.exit(0);
  }

  // update() solo pisa el campo `resumes`; el resto del documento queda intacto
  await configRef.update({ resumes: updated });
  console.log('\n✅ Campo resumes actualizado en config/app. El resto del doc quedó intacto.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
