// netlify/functions/send-email.js
// Envía un email desde la cuenta de Gmail del usuario usando el refresh
// token guardado en las variables de entorno de Netlify (uso personal,
// un solo usuario).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || 'No se pudo renovar el access token de Google.');
  }

  return data.access_token;
}

// Arma el mensaje RFC 2822 y lo codifica en base64url, como pide la Gmail API.
function buildRawMessage({ to, subject, body }) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Metodo no permitido' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'JSON invalido' }) };
  }

  const { to, subject, body } = payload;

  if (!to || !subject || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Faltan campos requeridos: to, subject, body' }),
    };
  }

  try {
    const accessToken = await getAccessToken();
    const raw = buildRawMessage({ to, subject, body });

    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ success: false, error: result.error?.message || 'Error al enviar el email' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
