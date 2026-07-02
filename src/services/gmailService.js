// src/services/gmailService.js
// Envío de emails vía Gmail API, usando la Netlify Function como backend.

export const sendEmail = async ({ to, subject, body }) => {
  const response = await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'No se pudo enviar el email');
  }

  return data;
};
