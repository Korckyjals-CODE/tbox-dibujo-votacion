/**
 * Configuración pública de la app.
 * El PIN de admin NUNCA se guarda en texto plano: solo su SHA-256.
 */
window.APP_CONFIG = {
  schoolName: "ABC Bilingual School",
  contestName: "XXII Certamen de Dibujo Digital TBox",
  theme: "Misión espacial",
  category: "Primaria — Marte",
  maxPicks: 3,
  drawingCount: 37,
  /** SHA-256 hex del PIN de admin (PIN no incluido en el repo) */
  adminPinHash:
    "8a133dd3e6c191815f447181b5db93894b674392b184a10b6b05e01b4e6a2e39",
  storageKeys: {
    voted: "tbox_abc_voted_v1",
    fpId: "tbox_abc_fp_id_v1",
    picks: "tbox_abc_picks_v1",
  },
};
