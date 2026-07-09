/**
 * updateResumes.cjs — actualiza SOLO el campo `resumes` de config/app.
 *
 * Usa la API REST de Firestore con token OAuth de gcloud (las security rules
 * solo permiten la cuenta de Google vía la web app, así que el SDK cliente
 * no sirve desde Node). PATCH con updateMask limitado a `resumes`: el resto
 * del documento (flags, statusOptions, otherDocuments, etc.) queda intacto.
 *
 * Requisitos: gcloud autenticado con marcopiermatei1@gmail.com. No usa .env.
 *
 * Uso:
 *   node scripts/updateResumes.cjs            # dry-run
 *   node scripts/updateResumes.cjs --execute  # aplica
 *
 * Para futuros cambios de CV: editar NEW_RESUMES acá abajo (los nombres deben
 * coincidir EXACTO con los archivos en public/resumes/) y correr con --execute.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ID = 'emails---trabajos';
const DOC_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/app`;
const DRY_RUN = !process.argv.includes('--execute');

// Estado deseado del array completo. Winery y Housekeeping, en este orden.
const NEW_RESUMES = [
  { id: 1, type: 'Winery', person: 'Belu', file: 'Resume W - July 2026 - Maria Belen Corzo.pdf' },
  { id: 2, type: 'Winery', person: 'Marco', file: 'Resume W - July 2026 - Marco Piermatei.pdf' },
  { id: 3, type: 'Housekeeping', person: 'Belu', file: 'Resume HK - July 2026 - Maria Belen Corzo.pdf' },
  { id: 4, type: 'Housekeeping', person: 'Marco', file: 'Resume HK - July 2026 - Marco Piermatei.pdf' },
];

function getToken() {
  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  } catch {
    console.error('❌ No pude obtener token de gcloud. Corré: gcloud auth login');
    process.exit(1);
  }
}

const toFirestore = r => ({
  mapValue: {
    fields: {
      id: { integerValue: String(r.id) },
      type: { stringValue: r.type },
      person: { stringValue: r.person },
      file: { stringValue: r.file },
      path: { stringValue: `/resumes/${r.file}` },
    },
  },
});

async function main() {
  for (const r of NEW_RESUMES) {
    if (!fs.existsSync(path.join(__dirname, '..', 'public', 'resumes', r.file))) {
      console.error(`❌ No existe public/resumes/${r.file} — abortando sin tocar Firestore.`);
      process.exit(1);
    }
  }

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const res = await fetch(`${DOC_URL}?mask.fieldPaths=resumes`, { headers });
  if (!res.ok) {
    console.error(`❌ Error leyendo config/app (${res.status}):`, await res.text());
    process.exit(1);
  }
  const current = (await res.json()).fields?.resumes?.arrayValue?.values || [];

  console.log('📄 Resumes actuales en Firestore:');
  const currentFiles = current.map(v => {
    const f = v.mapValue.fields;
    console.log(`   [${f.id.integerValue}] ${f.type.stringValue} / ${f.person.stringValue}: ${f.file.stringValue}`);
    return f.file.stringValue;
  });

  const changed = NEW_RESUMES.filter(r => !currentFiles.includes(r.file));
  if (changed.length === 0) {
    console.log('✅ Firestore ya está al día, nada para cambiar.');
    return;
  }

  console.log('\n🔁 Cambios a aplicar:');
  changed.forEach(r => console.log(`   [${r.id}] ${r.type} / ${r.person} → ${r.file}`));

  if (DRY_RUN) {
    console.log('\n🔍 Dry-run: no se escribió nada. Corré con --execute para aplicar.');
    return;
  }

  const body = JSON.stringify({
    fields: { resumes: { arrayValue: { values: NEW_RESUMES.map(toFirestore) } } },
  });
  const patch = await fetch(`${DOC_URL}?updateMask.fieldPaths=resumes&currentDocument.exists=true`, {
    method: 'PATCH',
    headers,
    body,
  });
  if (!patch.ok) {
    console.error(`❌ Error en el PATCH (${patch.status}):`, await patch.text());
    process.exit(1);
  }
  console.log('\n✅ Campo resumes actualizado en config/app. El resto del doc quedó intacto.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
