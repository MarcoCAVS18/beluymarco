# 🔥 Firebase Setup & Deployment

## 📋 Pre-requisitos

1. Instalar Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login a Firebase:
```bash
firebase login
```

## 🚀 Pasos para Setup Inicial

### 1. Deploy de Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Esto desplegará las reglas de seguridad definidas en `firestore.rules`.

### 2. Cargar empresas nuevas

Los datos ya estan cargados. Para agregar empresas nuevas se usan SOLO estos scripts, que unicamente crean documentos (nunca pisan), hacen backup previo en `scripts/backups/` y verifican al final:

```bash
node scripts/loadEmpresasNuevas.cjs            # wineries, dry-run
node scripts/loadHousekeepingNuevas.cjs        # housekeeping, dry-run
# agregar --execute para aplicar
```

## 📊 Estructura de Firestore

```
/wineries
  /{wineryId}
    - id: number
    - name: string
    - email: string
    - location: string
    - harvestStart: string
    - country: string
    - status: string
    - notes: string

/housekeeping
  /{housekeepingId}
    - id: number
    - name: string
    - email: string
    - location: string
    - season: string
    - country: string
    - status: string
    - notes: string

/templates
  /winery-email
    - content: string
  /winery-cover-letter
    - content: string
  /housekeeping-email
    - content: string
  /housekeeping-cover-letter
    - content: string

/config
  /app
    - flags: object
    - statusOptions: array
    - resumes: array
    - otherDocuments: array
```

## 🌐 Deploy a Firebase Hosting (Opcional)

Si querés hostear la app en Firebase en lugar de Netlify:

```bash
# Build del proyecto
npm run build

# Deploy a Firebase Hosting
firebase deploy --only hosting
```

Tu app estará disponible en: https://emails---trabajos.web.app

## 🔄 Actualizar Datos

### Actualizar Templates
Los templates se pueden editar directamente desde la app. Los cambios se guardan automáticamente en Firestore.

### Actualizar Wineries/Housekeeping
- **Desde la app:** Los cambios de status y notas se guardan automáticamente
- **Desde Firebase Console:** Podés editar manualmente en https://console.firebase.google.com

## 🔒 Seguridad

El acceso está restringido a una sola cuenta de Google (uso personal). Pasos de setup:

1. En Firebase Console > Authentication > Sign-in method, habilitar el proveedor **Google**.
2. En Firebase Console > Authentication > Settings > Authorized domains, agregar el dominio de Netlify del sitio (ej. `tu-sitio.netlify.app`).
3. `firestore.rules` ya exige `request.auth.token.email == 'marcopiermatei1@gmail.com'` para leer/escribir cualquier colección. Deployar con:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Si el email autorizado cambia, actualizar tanto `firestore.rules` como `VITE_ALLOWED_EMAIL` en las env vars de Netlify.

## 🆘 Troubleshooting

### Error: "Permission denied"
- Verificar que las reglas estén deployadas: `firebase deploy --only firestore:rules`
- Revisar en Firebase Console > Firestore > Rules

### Datos no aparecen en la app
1. Verificar en Firebase Console que los datos estén ahí
2. Revisar la consola del navegador por errores
3. Verificar que la config de Firebase en `src/firebase/config.js` sea correcta
