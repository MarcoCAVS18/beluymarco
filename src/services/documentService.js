// src/services/documentService.js
// Descarga PDFs (resumes, cover letters, e-visa) vía la Netlify Function
// protegida get-document.js, que exige login con la cuenta autorizada.

import { auth } from '../firebase/config';

const fetchAuthorized = async (docPath) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay sesion iniciada');
  }
  const idToken = await user.getIdToken();

  const response = await fetch(`/.netlify/functions/get-document?path=${encodeURIComponent(docPath)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo descargar el documento');
  }

  return response;
};

// Dispara la descarga en el navegador (reemplaza el <a href download> de antes).
export const downloadDocument = async (docPath, filename) => {
  const response = await fetchAuthorized(docPath);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Para adjuntar el PDF a un email (Gmail API espera el contenido en base64).
export const fetchDocumentAsBase64 = async (docPath) => {
  const response = await fetchAuthorized(docPath);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};
