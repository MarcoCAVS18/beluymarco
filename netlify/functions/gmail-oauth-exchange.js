// netlify/functions/gmail-oauth-exchange.js
// Recibe el "code" que Google manda al redirect_uri configurado en el
// OAuth Client, lo intercambia por tokens y muestra el refresh_token
// para copiarlo manualmente a la variable de entorno GOOGLE_REFRESH_TOKEN
// en Netlify. Es un paso de setup único (uso personal, un solo usuario).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const handler = async (event) => {
  const code = event.queryStringParameters?.code;

  if (!code) {
    return { statusCode: 400, body: 'Falta el parametro "code" en la URL.' };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return { statusCode: 500, body: 'Faltan variables de entorno de Google OAuth en Netlify.' };
  }

  try {
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokens = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(tokens) };
    }

    const refreshTokenBlock = tokens.refresh_token
      ? `<pre>${tokens.refresh_token}</pre>`
      : '<p>No se recibio refresh_token. Revoca el acceso previo en https://myaccount.google.com/permissions y volve a autorizar con prompt=consent.</p>';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<html><body>
        <h2>Autenticacion completada</h2>
        <p>Copia este valor en la variable de entorno <strong>GOOGLE_REFRESH_TOKEN</strong> en Netlify:</p>
        ${refreshTokenBlock}
      </body></html>`,
    };
  } catch {
    return { statusCode: 500, body: 'Error al intercambiar el codigo por tokens.' };
  }
};
