# Gmail OAuth - Setup

Functions:

- `gmail-oauth-exchange.js`: recibe el `code` que Google manda por redirect y lo intercambia por tokens (setup único).
- `send-email.js`: usa el refresh token guardado para enviar el email vía Gmail API.

## Variables de entorno (Netlify > Site settings > Environment variables)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` -> `https://TU-SITIO.netlify.app/.netlify/functions/gmail-oauth-exchange`
- `GOOGLE_REFRESH_TOKEN` -> se obtiene una sola vez con el paso 3

## Pasos de setup (una sola vez)

1. En Google Cloud Console, crear un OAuth Client ID tipo "Web application" con el scope `https://www.googleapis.com/auth/gmail.send` y agregar `GOOGLE_REDIRECT_URI` como Authorized redirect URI.
2. Armar esta URL reemplazando los valores y abrirla en el navegador logueado con la cuenta de Gmail a usar:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=TU_CLIENT_ID&redirect_uri=TU_REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent
```

3. Google redirige a `gmail-oauth-exchange`, que muestra el `refresh_token`. Copiarlo en la variable `GOOGLE_REFRESH_TOKEN` de Netlify.
4. Listo: `send-email` ya puede autenticar y enviar emails usando ese refresh token.
