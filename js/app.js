import { getFingerprint, sha256Hex } from "./fingerprint.js";
import {
  initFirebase,
  isFirebaseConfigured,
  watchMeta,
  watchVotes,
  submitVote,
  ensureMetaDefaults,
} from "./firebase-store.js";

const cfg = window.APP_CONFIG;
const state = {
  drawings: [],
  picks: new Set(),
  voted: false,
  votingOpen: true,
  firebaseOk: false,
  votes: {},
  submitting: false,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function loadLocalVoted() {
  return localStorage.getItem(cfg.storageKeys.voted) === "1";
}

function saveLocalVoted() {
  localStorage.setItem(cfg.storageKeys.voted, "1");
}

function loadLocalPicks() {
  try {
    const raw = localStorage.getItem(cfg.storageKeys.picks);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveLocalPicks() {
  localStorage.setItem(
    cfg.storageKeys.picks,
    JSON.stringify([...state.picks])
  );
}

function tallyVotes(votesObj) {
  const counts = {};
  for (let i = 1; i <= cfg.drawingCount; i++) counts[i] = 0;
  Object.values(votesObj || {}).forEach((v) => {
    if (!v || !Array.isArray(v.picks)) return;
    v.picks.forEach((n) => {
      const id = Number(n);
      if (counts[id] != null) counts[id] += 1;
    });
  });
  return counts;
}

function top3(counts) {
  return Object.entries(counts)
    .map(([id, c]) => ({ id: Number(id), votes: c }))
    .sort((a, b) => b.votes - a.votes || a.id - b.id)
    .slice(0, 3);
}

function showBanner(msg, type = "info") {
  const el = $("#status-banner");
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || "";
  el.dataset.type = type;
}

function updateStickyBar() {
  const count = state.picks.size;
  const countEl = $("#pick-count");
  const btn = $("#submit-vote");
  const bar = $("#sticky-bar");
  if (countEl) countEl.textContent = String(count);
  if (btn) {
    const canSubmit =
      state.votingOpen &&
      !state.voted &&
      state.firebaseOk &&
      count === cfg.maxPicks &&
      !state.submitting;
    btn.disabled = !canSubmit;
    btn.textContent = state.submitting
      ? "Enviando…"
      : state.voted
        ? "Voto enviado"
        : !state.votingOpen
          ? "Votación cerrada"
          : !state.firebaseOk
            ? "Falta configurar Firebase"
            : `Enviar voto (${count}/${cfg.maxPicks})`;
  }
  if (bar) {
    bar.dataset.ready = count === cfg.maxPicks ? "1" : "0";
  }
  const chips = $("#pick-chips");
  if (chips) {
    chips.innerHTML = "";
    [...state.picks]
      .sort((a, b) => a - b)
      .forEach((id) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = `Dibujo ${id}`;
        b.setAttribute("aria-label", `Quitar Dibujo ${id}`);
        b.addEventListener("click", () => togglePick(id));
        chips.appendChild(b);
      });
  }
}

function togglePick(id) {
  if (!state.votingOpen || state.voted) return;
  if (state.picks.has(id)) {
    state.picks.delete(id);
  } else {
    if (state.picks.size >= cfg.maxPicks) {
      showToast(`Solo puedes elegir ${cfg.maxPicks} dibujos.`);
      return;
    }
    state.picks.add(id);
  }
  saveLocalPicks();
  renderGallerySelection();
  updateStickyBar();
}

function renderGallerySelection() {
  $$(".drawing-card").forEach((card) => {
    const id = Number(card.dataset.id);
    const on = state.picks.has(id);
    card.classList.toggle("is-selected", on);
    card.setAttribute("aria-pressed", on ? "true" : "false");
    const badge = card.querySelector(".sel-badge");
    if (badge) badge.hidden = !on;
  });
}

function showToast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("is-visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("is-visible"), 2800);
}

function renderGallery() {
  const grid = $("#gallery");
  if (!grid) return;
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  state.drawings.forEach((d) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "drawing-card";
    card.dataset.id = String(d.id);
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", `Seleccionar Dibujo ${d.id}`);
    card.innerHTML = `
      <span class="drawing-num">Dibujo ${d.id}</span>
      <span class="drawing-frame">
        <img src="${d.src}" alt="Dibujo ${d.id}" loading="lazy" width="1200" height="675" />
        <span class="sel-badge" hidden aria-hidden="true">✓</span>
      </span>
    `;
    card.addEventListener("click", () => togglePick(d.id));
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  renderGallerySelection();
}

function renderWinners(counts) {
  const section = $("#winners");
  const voteSection = $("#vote-section");
  const guidelines = $("#guidelines");
  if (!section) return;

  if (state.votingOpen) {
    section.hidden = true;
    if (voteSection) voteSection.hidden = false;
    if (guidelines) guidelines.hidden = false;
    document.body.classList.remove("is-closed");
    return;
  }

  document.body.classList.add("is-closed");
  section.hidden = false;
  if (voteSection) voteSection.hidden = true;
  const list = $("#winners-list");
  if (!list) return;
  const winners = top3(counts);
  const byId = Object.fromEntries(state.drawings.map((d) => [d.id, d]));
  list.innerHTML = winners
    .map((w, i) => {
      const d = byId[w.id];
      return `
      <article class="winner-card" style="--i:${i}">
        <div class="winner-rank">${i + 1}.º lugar</div>
        <div class="winner-frame">
          <img src="${d ? d.src : ""}" alt="Dibujo ${w.id}" width="1200" height="675" />
        </div>
        <h3>Dibujo ${w.id}</h3>
        <p class="winner-votes">${w.votes} voto${w.votes === 1 ? "" : "s"}</p>
      </article>`;
    })
    .join("");
}

async function handleSubmit() {
  if (state.submitting) return;
  if (state.voted || loadLocalVoted()) {
    showToast("Ya enviaste tu voto desde este dispositivo.");
    state.voted = true;
    updateStickyBar();
    return;
  }
  if (state.picks.size !== cfg.maxPicks) {
    showToast(`Elige exactamente ${cfg.maxPicks} dibujos.`);
    return;
  }
  if (!state.firebaseOk) {
    showToast("Falta configurar Firebase. Ver SETUP.md");
    return;
  }
  if (!state.votingOpen) {
    showToast("La votación ya está cerrada.");
    return;
  }

  state.submitting = true;
  updateStickyBar();
  try {
    const fp = await getFingerprint();
    await submitVote({ picks: [...state.picks], fp });
    saveLocalVoted();
    state.voted = true;
    showToast("¡Gracias! Tu voto quedó registrado.");
    showBanner(
      "Tu voto ya fue enviado. Gracias por participar.",
      "success"
    );
  } catch (err) {
    if (err.code === "ALREADY_VOTED") {
      saveLocalVoted();
      state.voted = true;
      showBanner("Ya registraste un voto con este dispositivo.", "warn");
    } else {
      showToast(err.message || "No se pudo enviar el voto.");
      console.error(err);
    }
  } finally {
    state.submitting = false;
    updateStickyBar();
    renderGallerySelection();
  }
}

function applyMeta(meta) {
  state.votingOpen = meta.open !== false;
  if (!meta.configured) {
    showBanner(
      "Configuración pendiente: falta firebase-config.js. Puedes previsualizar la galería; los votos entre dispositivos se activan al configurar Firebase (ver SETUP.md).",
      "warn"
    );
    state.firebaseOk = false;
  } else if (!state.voted && state.votingOpen) {
    showBanner(
      "Elige exactamente 3 dibujos favoritos y envía tu voto una sola vez.",
      "info"
    );
    state.firebaseOk = true;
  } else if (!state.votingOpen) {
    showBanner("La votación está cerrada. Estos son los 3 ganadores.", "success");
    state.firebaseOk = true;
  }
  updateStickyBar();
  renderWinners(tallyVotes(state.votes));
  $$(".drawing-card").forEach((c) => {
    c.disabled = !state.votingOpen || state.voted;
  });
}

async function boot() {
  state.voted = loadLocalVoted();
  loadLocalPicks().forEach((id) => state.picks.add(id));

  // Hash route #admin → admin.html
  if (location.hash === "#admin") {
    location.replace("admin.html");
    return;
  }

  try {
    const res = await fetch("drawings/manifest.json", { cache: "no-cache" });
    state.drawings = await res.json();
  } catch (e) {
    showBanner("No se pudo cargar la galería de dibujos.", "error");
    console.error(e);
    return;
  }

  renderGallery();
  updateStickyBar();

  const submitBtn = $("#submit-vote");
  if (submitBtn) submitBtn.addEventListener("click", handleSubmit);

  const clearBtn = $("#clear-picks");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (state.voted || !state.votingOpen) return;
      state.picks.clear();
      saveLocalPicks();
      renderGallerySelection();
      updateStickyBar();
    });
  }

  if (isFirebaseConfigured()) {
    initFirebase();
    state.firebaseOk = true;
    await ensureMetaDefaults();
    watchMeta(applyMeta);
    watchVotes((votes) => {
      state.votes = votes;
      // Si este fingerprint ya votó en el servidor, marcar local
      getFingerprint().then((fp) => {
        const already = Object.values(votes || {}).some((v) => v && v.fp === fp);
        if (already) {
          state.voted = true;
          saveLocalVoted();
        }
        updateStickyBar();
        renderWinners(tallyVotes(votes));
        $$(".drawing-card").forEach((c) => {
          c.disabled = !state.votingOpen || state.voted;
        });
      });
    });
  } else {
    applyMeta({ open: true, configured: false });
  }

  // Entrada suave de tarjetas
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
}

// Export sha256Hex for potential debug; keep module side-effect free besides boot
void sha256Hex;
boot();
