# App con invitaciones: cómo se configura

La app ahora tiene dos tipos de cuenta:

- **Admin** (`marcopiermatei1@gmail.com`): todo como siempre, más el panel **Admin**
  (invitaciones y uso de la cuota). Es la única que crea o edita empresas.
- **Invitados**: entran solo si el admin los invitó, ven solo los rubros que se les eligieron,
  y tienen sus propios estados, notas, CVs, templates y envío desde su Gmail.

## Cómo se protege

| Qué | Quién lo controla |
|---|---|
| Quién entra y qué puede leer/escribir | `firestore.rules` (corre en Google, no en el navegador) |
| Qué empresas ve cada invitado | la función `netlify/functions/catalog.js` |
| Envío de emails del invitado | Google, con el permiso `gmail.send` que da él (dura 1 h, solo en memoria) |

- Los invitados **no** pueden leer el catálogo directo: los documentos tienen los estados y notas
  del admin, y las reglas no pueden esconder campos. Lo reciben de `catalog`, que devuelve solo
  nombre, email, ubicación, país, temporada y similares.
- `members/{email}` lo escribe solo el admin: nadie se puede auto-invitar ni cambiar sus rubros.
- Cada invitado escribe únicamente en `users/{su-email}` y con campos validados.
- Las reglas se prueban con el emulador de Firestore (51 casos: admin, invitado, revocado,
  desconocido, sin sesión, intentos de escalar permisos, archivos gigantes, etc.).

## Pasos para activarlo (una sola vez)

### 1. Variable de entorno en Netlify

Netlify → Site configuration → Environment variables → Add a variable:

- **Key:** `FIREBASE_SA_KEY`
- **Value:** el JSON completo de la cuenta de servicio de **solo lectura**
  (`claude-lectura@emails---trabajos.iam.gserviceaccount.com`, rol *Cloud Datastore Viewer*).
- Marcar **Contains secret values**.

Después: Deploys → **Trigger deploy** (las funciones leen las variables al deployar).

### 2. Publicar las reglas de Firestore

Desde la carpeta del repo, con tu cuenta (la de admin):

```
firebase deploy --only firestore:rules
```

Si no tenés la CLI: `npm install -g firebase-tools` y `firebase login`.

### 3. Permisos de Google (pantalla de consentimiento)

Google Cloud Console del proyecto `emails---trabajos` → **Google Auth Platform**:

1. **Data access** → *Add or remove scopes* → agregar
   `https://www.googleapis.com/auth/gmail.send` (enviar emails de los invitados).
2. **Audience** → *Publishing status*:
   - **Testing**: cada invitado tiene que estar en *Test users* (hasta 100). El permiso
     de Gmail vence cada 7 días como máximo, igual la app lo pide de nuevo con un toque.
   - **In production** (sin verificar): no hace falta cargar test users; los invitados ven la
     pantalla "Google no verificó esta app" → *Configuración avanzada* → *Ir a la app*.

### 4. Login por el propio dominio (iPhone / Safari)

Safari aísla el almacenamiento entre dominios y el login vía `emails---trabajos.firebaseapp.com`
falla con *"missing initial state"*. `netlify.toml` ya reenvía `/__/auth/*` y `/__/firebase/*` a
Firebase; falta apuntar la app a tu dominio:

1. Netlify → Environment variables → `VITE_FIREBASE_AUTH_DOMAIN` = tu dominio de Netlify
   (por ejemplo `tu-sitio.netlify.app`, sin `https://`).
2. Google Cloud → APIs y servicios → **Credenciales** → el cliente OAuth *"Web client (auto created
   by Google Service)"*:
   - **Orígenes de JavaScript autorizados**: `https://tu-sitio.netlify.app`
   - **URIs de redireccionamiento autorizados**: `https://tu-sitio.netlify.app/__/auth/handler`
3. Firebase → Authentication → Settings → **Authorized domains**: que esté `tu-sitio.netlify.app`.
4. Netlify → **Trigger deploy** (la variable `VITE_` se usa al compilar).

### 5. Probar

1. Panel **Admin** → **Invitar** → un email de prueba (por ejemplo el de Belu) → elegir rubros.
2. Abrir la app en otra ventana privada con esa cuenta → paso a paso → enviar un email de prueba.
3. En el panel, **Quitar** acceso y comprobar que la otra cuenta ve "Tu acceso fue pausado".

## Costos

Plan **Spark** (gratis): si se llega al límite diario (50.000 lecturas, 20.000 escrituras), la app
deja de leer hasta la medianoche del Pacífico. **No se cobra nada nunca.** El panel de admin tiene un
botón a la pestaña **Uso** de Firebase, que muestra los números reales del día. (La API de métricas
de Google Cloud no sirve para esto en Spark: exige facturación activada.)

Los PDFs de los invitados se guardan partidos en pedazos dentro de Firestore (sin Storage, que
pediría el plan Blaze): hasta 6 MB por archivo y 12 MB por persona.
