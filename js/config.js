/**
 * Configuración pública de la app.
 * El PIN de admin NUNCA se guarda en texto plano: solo hashes.
 * Incluye SHA-256 (https) y hash legacy (http) porque el sitio puede servirce sin TLS.
 */
window.APP_CONFIG = {
  schoolName: "ABC Bilingual School",
  contestName: "XXII Certamen de Dibujo Digital TBox",
  theme: "Misión espacial",
  category: "Primaria — Marte",
  maxPicks: 3,
  drawingCount: 37,
  /** @deprecated usar adminPinHashes */
  adminPinHash:
    "8a133dd3e6c191815f447181b5db93894b674392b184a10b6b05e01b4e6a2e39",
  /** SHA-256 y fallback http del PIN */
  adminPinHashes: [
    "8a133dd3e6c191815f447181b5db93894b674392b184a10b6b05e01b4e6a2e39",
    "bb06f5c53c3a5fb5bb06f5c53c3a5fb5bb06f5c53c3a5fb5bb06f5c53c3a5fb5",
  ],
  storageKeys: {
    voted: "tbox_abc_voted_v1",
    fpId: "tbox_abc_fp_id_v1",
    picks: "tbox_abc_picks_v1",
  },
};
