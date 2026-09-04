/**
 * Huella estable del navegador: UA + pantalla + zona horaria + id aleatorio en localStorage.
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
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
