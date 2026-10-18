// Envío de emails según la cuenta:
//  - Admin: la Netlify Function send-email, con el Gmail del admin (como siempre).
//  - Invitado: directo desde el navegador a la Gmail API con SU cuenta. El permiso
//    (gmail.send) lo da él con un popup de Google, dura ~1 h y queda solo en memoria.
import { sendEmail as sendViaFunction } from './gmailService';

const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// Tiempo máximo para el envío en sí (no cuenta el rato en el popup de permiso de Google)
export const SEND_TIMEOUT_MS = 20000;

export class SendTimeoutError extends Error {
  constructor() {
    super('Gmail no respondió a tiempo. Revisá tu conexión y probá de nuevo.');
    this.name = 'SendTimeoutError';
  }
}

// Corta la espera a los `ms`. Si la promesa termina bien DESPUÉS del corte (el email
// salió igual), avisa con `onLate` para no dejarlo marcado como no enviado.
export const withTimeout = (promise, ms, onLate) =>
  new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new SendTimeoutError());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        if (timedOut) onLate?.(value);
        else resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        if (!timedOut) reject(err);
      }
    );
  });

const utf8ToBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

// Mensaje RFC 2822 en base64url, igual que arma netlify/functions/send-email.js
const buildRawMessage = ({ to, subject, body, attachments }) => {
  const headers = [`To: ${to}`, `Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`, 'MIME-Version: 1.0'];
  let message;
  if (attachments?.length) {
    const boundary = `mixed_${Date.now().toString(36)}`;
    const parts = [...headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', utf8ToBase64(body).replace(/.{1,76}/g, '$&\r\n').trimEnd()];
    for (const att of attachments) {
      const name = att.filename.replace(/"/g, '');
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${name}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${name}"`,
        '',
        att.data.replace(/.{1,76}/g, '$&\r\n').trimEnd()
      );
    }
    parts.push(`--${boundary}--`);
    message = parts.join('\r\n');
  } else {
    message = [...headers, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', utf8ToBase64(body)].join('\r\n');
  }
  return utf8ToBase64(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const sendFromBrowser = async (token, payload) => {
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: buildRawMessage(payload) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Gmail no pudo enviar el email');
    err.status = res.status;
    throw err;
  }
  return data;
};

// `getGmailToken` viene de useAuth (pide permiso si hace falta).
// `onLateSuccess`: el envío se dio por fallido por tiempo, pero al final salió.
export const sendAs = async ({ isAdmin, getGmailToken }, payload, { onLateSuccess } = {}) => {
  const timed = (p) => withTimeout(p, SEND_TIMEOUT_MS, onLateSuccess);
  if (isAdmin) return timed(sendViaFunction(payload));
  let token = await getGmailToken();
  try {
    return await timed(sendFromBrowser(token, payload));
  } catch (err) {
    // Si Google revocó o venció el permiso antes de tiempo, se pide de nuevo una vez
    if (err.status !== 401) throw err;
    token = await getGmailToken({ force: true });
    return timed(sendFromBrowser(token, payload));
  }
};
