# Votación maestros — Certamen Dibujo Digital TBox (Primaria)

Sitio estático (GitHub Pages) para que los maestros de **ABC Bilingual School** elijan
sus **3 dibujos favoritos** de Primaria del XXII Certamen de Dibujo Digital TBox
(tema **Misión espacial** — Marte).

**Sin nombres de alumnos.** Solo «Dibujo 1» … «Dibujo 37».

## URL del sitio

Cuando Pages esté activo:

`https://korckyjals-code.github.io/tbox-dibujo-votacion/`

Admin: `https://korckyjals-code.github.io/tbox-dibujo-votacion/admin.html`  
(también `#admin` redirige al panel).

## Activar GitHub Pages

1. Repo → **Settings** → **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: **`main`** / folder: **`/` (root)** → **Save**.
4. Espera 1–2 minutos y abre la URL de arriba.

Con la API de GitHub (si tienes permisos):

```bash
gh api repos/Korckyjals-CODE/tbox-dibujo-votacion/pages \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/
```

## Cómo votar (maestros)

1. Abre el sitio en el teléfono.
2. Lee la guía breve.
3. Toca **exactamente 3** dibujos (barra inferior: Seleccionados X/3).
4. Pulsa **Enviar voto**.
5. Solo se acepta **un voto por dispositivo** (localStorage + huella del navegador).

Si la votación ya cerró, verás el **top 3** con imagen, número y conteo.

## Cómo administrar (Jorge)

1. Abre `/admin.html`.
2. Introduce el **PIN** (el que te pasaron por mensaje privado; no está en el repo).
3. Revisa **Top 3** y el **conteo completo**.
4. **Cerrar votación** cuando terminen de votar (la portada muestra ganadores).
5. Puedes **Reabrir** si hace falta.

## Firebase (votos entre dispositivos)

GitHub Pages es solo estático. Los votos viven en **Firebase Realtime Database**.

Pasos exactos: **[SETUP.md](SETUP.md)**.

Hasta configurar Firebase verás «Configuración pendiente»: la UI se puede previsualizar,
pero no hay conteo real entre teléfonos.

Archivos clave:

- `firebase-config.example.js` → cópialo a `firebase-config.js`
- `database.rules.json` → súbelo a las reglas de RTDB
- `drawings/` + `drawings/manifest.json` → galería anónima

## Desarrollo local

Sirve la carpeta raíz con cualquier servidor estático (módulos ES + `fetch`):

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Estructura

```
index.html          Votación pública
admin.html          Panel admin (PIN)
css/styles.css
js/                 app, admin, firebase, fingerprint, config
drawings/           01.jpg … 37.jpg + manifest.json
database.rules.json Reglas RTDB
SETUP.md            Guía Firebase
```

## Privacidad

No hay archivo de nombres de estudiantes en este repositorio público.
Los archivos de imagen se renombraron a `01.jpg` … `37.jpg`.
