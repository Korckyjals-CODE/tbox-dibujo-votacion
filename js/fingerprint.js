/**
 * Huella estable del navegador: UA + pantalla + zona horaria + id aleatorio en localStorage.
 * Incluye fallback si crypto.subtle no está (p. ej. sitio servido por http).
 */
export async function getFingerprint() {
  const key = window.APP_CONFIG.storageKeys.fpId;
  let rid = localStorage.getItem(key);
  if (!rid) {
    rid = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, rid);
  }

  const raw = [
    navigator.userAgent || "",
    `${screen.width}x${screen.height}x${screen.colorDepth || ""}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    rid,
  ].join("|");

  return sha256Hex(raw);
}

export async function sha256Hex(text) {
  if (globalThis.crypto && crypto.subtle && globalThis.isSecureContext !== false) {
    try {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // caer al fallback
    }
  }
  return legacyHashHex(text);
}

/** FNV-1a 32-bit repetido — suficiente para anti-doble-voto en http. */
function legacyHashHex(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0xabcdef;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + ((i * 31) & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  // expandir a 64 hex chars para parecerse a sha256
  return (a + b + a + b + a + b + a + b).slice(0, 64);
}
