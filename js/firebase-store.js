/**
 * Inicialización Firebase Realtime Database (modular CDN v10+).
 * Devuelve null si la config no está lista.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

let db = null;
let ready = false;

export function isFirebaseConfigured() {
  const c = window.FIREBASE_CONFIG;
  if (!c || typeof c !== "object") return false;
  if (!c.apiKey || !c.databaseURL || !c.projectId) return false;
  if (String(c.apiKey).includes("TU_API_KEY")) return false;
  if (String(c.databaseURL).includes("TU_PROYECTO")) return false;
  return true;
}

export function initFirebase() {
  if (!isFirebaseConfigured()) {
    ready = false;
    db = null;
    return null;
  }
  if (db) return db;
  const app = initializeApp(window.FIREBASE_CONFIG);
  db = getDatabase(app);
  ready = true;
  return db;
}

export function isReady() {
  return ready && !!db;
}

export function metaRef() {
  return ref(db, "meta");
}

export function votesRef() {
  return ref(db, "votes");
}

export async function fetchMeta() {
  if (!isReady()) return { open: true, configured: false };
  const snap = await get(metaRef());
  const val = snap.val();
  if (!val) {
    // Primera vez: dejar abierto por defecto en cliente; Jorge puede inicializar en Firebase
    return { open: true, configured: true };
  }
  return { ...val, open: val.open !== false, configured: true };
}

export function watchMeta(callback) {
  if (!isReady()) {
    callback({ open: true, configured: false });
    return () => {};
  }
  return onValue(metaRef(), (snap) => {
    const val = snap.val() || {};
    callback({ ...val, open: val.open !== false, configured: true });
  });
}

export function watchVotes(callback) {
  if (!isReady()) {
    callback({});
    return () => {};
  }
  return onValue(votesRef(), (snap) => {
    callback(snap.val() || {});
  });
}

export async function submitVote({ picks, fp }) {
  if (!isReady()) {
    throw new Error("Firebase no configurado");
  }
  const meta = await fetchMeta();
  if (meta.open === false) {
    throw new Error("La votación está cerrada");
  }

  // Rechazar si ya existe un voto con el mismo fingerprint
  const all = await get(votesRef());
  const votes = all.val() || {};
  for (const id of Object.keys(votes)) {
    if (votes[id] && votes[id].fp === fp) {
      const err = new Error("Ya registraste tu voto en este dispositivo");
      err.code = "ALREADY_VOTED";
      throw err;
    }
  }

  const newRef = push(votesRef());
  await set(newRef, {
    picks: picks.map(Number),
    fp,
    ts: Date.now(),
  });
  return newRef.key;
}

export async function closeVoting() {
  if (!isReady()) throw new Error("Firebase no configurado");
  await update(metaRef(), {
    open: false,
    closedAt: Date.now(),
    closedBy: "admin",
  });
}

export async function openVoting() {
  if (!isReady()) throw new Error("Firebase no configurado");
  await update(metaRef(), {
    open: true,
    reopenedAt: Date.now(),
    closedBy: null,
  });
}

export async function ensureMetaDefaults() {
  if (!isReady()) return;
  const snap = await get(metaRef());
  if (!snap.exists()) {
    await set(metaRef(), { open: true, createdAt: Date.now() });
  }
}

export { getDatabase, ref, get, set, push, onValue, update };
