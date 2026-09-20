# Configuración Firebase (Realtime Database)

La votación entre dispositivos usa **Firebase Realtime Database** (plan gratuito Spark).
Hasta que pegues tu config, el sitio muestra el aviso «Configuración pendiente» y permite
previsualizar la galería, pero **no guarda votos entre teléfonos**.

## Estado actual (proyecto en reposo)

Este repo es **público** y la app puede no usarse hasta el próximo certamen. Mientras tanto:

- `firebase-config.js` **no** está en el árbol de Git (solo `firebase-config.example.js`).
- `database.rules.json` está en **deny-by-default** (sin lectura/escritura pública).
- Despliega esas reglas en Firebase Console para que la RTDB abierta no sea abusable.

Cuando reactivéis la votación el año que viene, volved a este documento: config local + reglas
revisadas con cuidado (no reabrir `.write` público en `/meta` a la ligera).

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

## 4. Pegar config en el sitio (solo local / deploy)

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

`firebase-config.js` está en **`.gitignore`**. No lo subas a un repositorio público.

### Seguridad / config de cliente responsable

- La `apiKey` web de Firebase **es esperada en el navegador** cuando el sitio está desplegado;
  no es un secreto de servidor al estilo de una clave privada.
- Aun así, **no debe vivir en el árbol Git de un repo público**: usa el example localmente
  (o inyecta la config solo en el entorno de deploy).
- La seguridad real viene de las **reglas RTDB** y, opcionalmente, de **restricciones
  HTTP-referrer** en la API key (Google Cloud Console → APIs & Services → Credentials).
- Si GitHub marcó un secret-scanning alert por una key antigua en el historial: restringe o
  **rota** la clave en Google Cloud Console y marca el alert como resuelto allí. **No se puede
  rotar la key solo desde este repo**; quitar el archivo de `HEAD` evita re-exponerla en el
  árbol actual, pero el historial Git puede seguir conteniendo el valor hasta una rotación.

Para GitHub Pages en el futuro: publica `firebase-config.js` solo en el artefacto de deploy
(o un commit privado / entorno), no como archivo permanente en un repo público. Mientras el
proyecto duerme, Pages puede mostrar «Configuración pendiente» sin config en Git.

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

### Qué permiten las reglas (estado dormido)

| Ruta | Lectura | Escritura |
|------|---------|-----------|
| `/` (todo) | no | no |

Deny-by-default: nadie escribe ni lee desde clientes anónimos mientras el proyecto no se use.

### Al reactivar la votación (próximo año)

Reabre reglas **con cuidado**. Un patrón típico de este sondeo escolar (solo tras revisar riesgos):

| Ruta | Lectura | Escritura |
|------|---------|-----------|
| `/meta` | sí | **no** pública (preferible Auth o backend; evita `.write: true`) |
| `/votes/{id}` | sí | solo **crear** si `/meta/open !== false`; sin update/delete |

No vuelvas a dejar `/meta` escribible por el mundo: el cierre de votación por PIN en cliente
no es control de acceso real.

Esquema:

```
/meta/open          boolean (default true)
/meta/closedAt      number
/meta/closedBy      "admin"
/votes/{voteId}     { picks:[n,n,n], fp:string, ts:number }
```

## 6. Inicializar meta (opcional)

Cuando las reglas permitan escritura autenticada o temporal de setup, crea en la consola
Firebase → Data → `meta` → `{ "open": true }`. Con reglas deny-all, solo un admin de
Console puede tocar los datos.

## 7. Probar

1. Abre el sitio en el móvil (con `firebase-config.js` local y reglas de votación desplegadas).
2. Elige 3 dibujos → **Enviar voto**.
3. Abre `admin.html`, introduce el PIN, verifica el conteo.
4. **Cerrar votación** → la portada muestra el top 3.

## Seguridad (aviso honesto)

Este es un sondeo escolar: el PIN se valida en el cliente (hash SHA-256). No uses este
patrón para datos sensibles. Si necesitas más control, añade Firebase Auth + reglas por UID.

## PIN de admin

El PIN **no** está en el código fuente ni en este documento. Solo su hash SHA-256
está en `js/config.js`. Usa el PIN que te compartieron por canal privado.
