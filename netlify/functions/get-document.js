// netlify/functions/get-document.js
// Sirve PDFs sensibles (resumes, cover letters, e-visa) que antes vivían en
// public/ y eran descargables por cualquiera sin login. Ahora requieren el
// mismo ID token de Firebase Auth que send-email.js.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, 'assets');
const ALLOWED_PREFIXES = ['resumes/', 'documents/', 'cover/'];
const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

async function verifyAuthorizedUser(authHeader) {
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return false;

  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const allowedEmail = process.env.VITE_ALLOWED_EMAIL || 'marcopiermatei1@gmail.com';

  const response = await fetch(`${LOOKUP_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  const user = data.users?.[0];
  return user?.email === allowedEmail;
}

// Solo permite servir archivos dentro de ASSETS_DIR bajo los prefijos
// conocidos, y bloquea cualquier intento de path traversal (../..).
function resolveSafePath(requestedPath) {
  if (!requestedPath) return null;
  const normalized = requestedPath.replace(/^\/+/, '');
  if (!ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;

  const resolved = path.resolve(ASSETS_DIR, normalized);
  if (!resolved.startsWith(ASSETS_DIR + path.sep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;

  return resolved;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Metodo no permitido' }) };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const authorized = await verifyAuthorizedUser(authHeader).catch(() => false);
  if (!authorized) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: 'No autorizado' }) };
  }

  const filePath = resolveSafePath(event.queryStringParameters?.path);
  if (!filePath) {
    return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Documento no encontrado' }) };
  }

  const data = fs.readFileSync(filePath);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
    },
    body: data.toString('base64'),
    isBase64Encoded: true,
  };
};
