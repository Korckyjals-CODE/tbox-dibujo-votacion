# Configuración Firebase (Realtime Database)

La votación entre dispositivos usa **Firebase Realtime Database** (plan gratuito Spark).
Hasta que pegues tu config, el sitio muestra el aviso «Configuración pendiente» y permite
previsualizar la galería, pero **no guarda votos entre teléfonos**.

## 1. Crear proyecto

1. Entra a [Firebase Console](https://console.firebase.google.com/).
2. **Agregar proyecto** → nombre sugerido: `abc-tbox-votacion` → continúa (Google Analytics opcional).
3. Abre el proyecto.

## 2. Crear Realtime Database

1. Menú **Build → Realtime Database → Create Database**.
2. Ubicación: la más cercana disponible (p. ej. `us-central1`).
3. Empieza en **modo bloqueado** (locked); luego subirás las reglas del repo.
4. Copia la **URL** de la base (algo como `https://abc-tbox-votacion-default-rtdb.firebaseio.com`).

## 3. Registrar app web

1. En la página de inicio del proyecto, **Add app → Web** (`</>`).
2. Apodo: `votacion-pages`.
3. Copia el objeto `firebaseConfig` que te muestra Firebase.

## 4. Pegar config en el sitio

En la raíz del repo:

```bash
cp firebase-config.example.js firebase-config.js
```

Edita `firebase-config.js` y reemplaza los valores `TU_*` con los de Firebase:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://....firebaseio.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

**Importante:** `databaseURL` debe apuntar a tu Realtime Database.

### ¿Subir `firebase-config.js` a GitHub?

- La `apiKey` de cliente de Firebase es pública por diseño; la seguridad real está en las **reglas**.
- Para GitHub Pages, **sí debes publicar** `firebase-config.js` en la rama `main` (quítalo de `.gitignore` o fuerza el add).
- Alternativa: guarda el archivo solo en Pages vía commit y rotación si hace falta.

Para publicarlo la primera vez:

```bash
# Quita firebase-config.js de .gitignore, o:
git add -f firebase-config.js
git commit -m "Add Firebase client config for Pages"
git push
```

## 5. Publicar reglas

1. En Firebase Console → **Realtime Database → Rules**.
2. Pega el contenido de [`database.rules.json`](database.rules.json) del repo
   (el objeto interior `rules`, o usa Firebase CLI).

Con Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase init database   # selecciona el proyecto
# Asegúrate de que database.rules.json sea el del repo
firebase deploy --only database
```

### Qué permiten las reglas

| Ruta | Lectura | Escritura |
|------|---------|-----------|
| `/meta` | sí | sí (cierre desde admin; seguridad por oscuridad + PIN en cliente) |
| `/votes/{id}` | sí | solo **crear** si `/meta/open !== false`; sin update/delete |

Esquema:

```
/meta/open          boolean (default true)
/meta/closedAt      number
/meta/closedBy      "admin"
/votes/{voteId}     { picks:[n,n,n], fp:string, ts:number }
```

## 6. Inicializar meta (opcional)

La app crea `{ open: true }` si `/meta` no existe. También puedes crear en la consola
Firebase → Data → `meta` → `{ "open": true }`.

## 7. Probar

1. Abre el sitio en el móvil.
2. Elige 3 dibujos → **Enviar voto**.
3. Abre `admin.html`, introduce el PIN, verifica el conteo.
4. **Cerrar votación** → la portada muestra el top 3.

## Seguridad (aviso honesto)

Este es un sondeo escolar: el PIN se valida en el cliente (hash SHA-256) y `/meta` es
escribible desde cualquier cliente que conozca la ruta. No uses este patrón para datos
sensibles. Si necesitas más control, añade Firebase Auth + reglas por UID.

## PIN de admin

El PIN **no** está en el código fuente ni en este documento. Solo su hash SHA-256
está en `js/config.js`. Usa el PIN que te compartieron por canal privado.
