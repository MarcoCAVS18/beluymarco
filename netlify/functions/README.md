# Gmail OAuth - Setup

Functions:

- `gmail-oauth-exchange.js`: recibe el `code` que Google manda por redirect y lo intercambia por tokens (setup único).
- `send-email.js`: usa el refresh token guardado para enviar el email vía Gmail API. Requiere un
  header `Authorization: Bearer <idToken>` de Firebase Auth de la cuenta autorizada (mismo email
  que valida `firestore.rules`); sin eso devuelve 401. Esto evita que cualquiera que descubra la
  URL pública de la function pueda mandar correos desde esta cuenta sin login.

## Variables de entorno (Netlify > Site settings > Environment variables)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` -> `https://TU-SITIO.netlify.app/.netlify/functions/gmail-oauth-exchange`
- `GOOGLE_REFRESH_TOKEN` -> se obtiene una sola vez con el paso 3
- `VITE_FIREBASE_API_KEY` -> ya existe para el build del frontend; `send-email` la reusa para
  validar el idToken contra la API de Identity Toolkit.
- `VITE_ALLOWED_EMAIL` -> opcional, mismo default que `firestore.rules` (`marcopiermatei1@gmail.com`).

## Pasos de setup (una sola vez)

1. En Google Cloud Console, crear un OAuth Client ID tipo "Web application" con el scope `https://www.googleapis.com/auth/gmail.send` y agregar `GOOGLE_REDIRECT_URI` como Authorized redirect URI.
2. Armar esta URL reemplazando los valores y abrirla en el navegador logueado con la cuenta de Gmail a usar:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=TU_CLIENT_ID&redirect_uri=TU_REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent
```

3. Google redirige a `gmail-oauth-exchange`, que muestra el `refresh_token`. Copiarlo en la variable `GOOGLE_REFRESH_TOKEN` de Netlify.
4. Tras cambiar la variable, hacer Trigger deploy en Netlify: las functions leen las env vars al deployar.
5. Listo: `send-email` ya puede autenticar y enviar emails usando ese refresh token.

## ⚠️ "Token has been expired or revoked"

Si la app OAuth está en modo **Testing** en Google Cloud Console, Google expira los refresh
tokens **a los 7 días** y send-email devuelve 500 con ese mensaje. Solución definitiva:
Google Cloud Console → Google Auth Platform → **Audience** (https://console.cloud.google.com/auth/audience)
→ Publishing status: Testing → **Publish app** (el aviso de "app no verificada" es
inofensivo para uso personal). Después repetir los pasos 2-4 para generar un token nuevo.
