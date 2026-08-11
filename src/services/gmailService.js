// src/services/gmailService.js
// Envío de emails vía Gmail API, usando la Netlify Function como backend.

import { auth } from '../firebase/config';

// `attachments` es opcional: [{ filename, contentType, data }] con data en base64.
export const sendEmail = async ({ to, subject, body, attachments }) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay sesion iniciada');
  }
  const idToken = await user.getIdToken();

  const response = await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ to, subject, body, attachments }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'No se pudo enviar el email');
  }

  return data;
};
