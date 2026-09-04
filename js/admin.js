import { sha256Hex } from "./fingerprint.js";
import {
  initFirebase,
  isFirebaseConfigured,
  watchMeta,
  watchVotes,
  closeVoting,
  openVoting,
  ensureMetaDefaults,
} from "./firebase-store.js";

const cfg = window.APP_CONFIG;
const AUTH_KEY = "tbox_abc_admin_ok_v1";

const state = {
  unlocked: sessionStorage.getItem(AUTH_KEY) === "1",
  drawings: [],
  votes: {},
  meta: { open: true },
};

const $ = (sel) => document.querySelector(sel);

function tally(votesObj) {
  const counts = {};
  for (let i = 1; i <= cfg.drawingCount; i++) counts[i] = 0;
  let totalBallots = 0;
  Object.values(votesObj || {}).forEach((v) => {
    if (!v || !Array.isArray(v.picks)) return;
    totalBallots += 1;
    v.picks.forEach((n) => {
      const id = Number(n);
      if (counts[id] != null) counts[id] += 1;
    });
  });
  return { counts, totalBallots };
}

function ranked(counts) {
  return Object.entries(counts)
    .map(([id, c]) => ({ id: Number(id), votes: c }))
    .sort((a, b) => b.votes - a.votes || a.id - b.id);
}

function showLoginError(msg) {
  const el = $("#login-error");
  if (el) {
    el.textContent = msg || "";
    el.hidden = !msg;
  }
}

async function tryUnlock(pin) {
  const hash = await sha256Hex(pin.trim());
  if (hash === cfg.adminPinHash) {
    sessionStorage.setItem(AUTH_KEY, "1");
    state.unlocked = true;
    render();
    return true;
  }
  showLoginError("PIN incorrecto.");
  return false;
}

function render() {
  const login = $("#admin-login");
  const panel = $("#admin-panel");
  if (!login || !panel) return;

  if (!state.unlocked) {
    login.hidden = false;
    panel.hidden = true;
    return;
  }

  login.hidden = true;
  panel.hidden = false;

  const cfgBanner = $("#admin-config-banner");
  if (cfgBanner) {
    if (!isFirebaseConfigured()) {
      cfgBanner.hidden = false;
      cfgBanner.textContent =
        "Configuración pendiente: crea firebase-config.js (ver SETUP.md). Sin Firebase no hay resultados reales.";
    } else {
      cfgBanner.hidden = true;
    }
  }

  const status = $("#voting-status");
  if (status) {
    status.textContent = state.meta.open
      ? "Votación ABIERTA"
      : "Votación CERRADA";
    status.dataset.open = state.meta.open ? "1" : "0";
  }

  const closeBtn = $("#btn-close");
  const openBtn = $("#btn-open");
  if (closeBtn) closeBtn.disabled = !isFirebaseConfigured() || !state.meta.open;
  if (openBtn) openBtn.disabled = !isFirebaseConfigured() || state.meta.open;

  const { counts, totalBallots } = tally(state.votes);
  const order = ranked(counts);
  const byId = Object.fromEntries(state.drawings.map((d) => [d.id, d]));

  const totalEl = $("#total-ballots");
  if (totalEl) totalEl.textContent = String(totalBallots);

  const top = $("#top3");
  if (top) {
    top.innerHTML = order
      .slice(0, 3)
      .map((w, i) => {
        const d = byId[w.id];
        return `
        <article class="winner-card admin-winner" style="--i:${i}">
          <div class="winner-rank">${i + 1}.º — Dibujo ${w.id}</div>
          <div class="winner-frame">
            <img src="${d ? d.src : ""}" alt="Dibujo ${w.id}" />
          </div>
          <p class="winner-votes">${w.votes} voto${w.votes === 1 ? "" : "s"}</p>
        </article>`;
      })
      .join("");
  }

  const table = $("#tally-body");
  if (table) {
    table.innerHTML = order
      .map(
        (r) => `
      <tr>
        <td>Dibujo ${r.id}</td>
        <td>${r.votes}</td>
        <td><div class="bar"><span style="width:${pct(r.votes, order[0]?.votes || 1)}%"></span></div></td>
      </tr>`
      )
      .join("");
  }
}

function pct(n, max) {
  if (!max) return 0;
  return Math.max(4, Math.round((n / max) * 100));
}

async function boot() {
  try {
    const res = await fetch("drawings/manifest.json", { cache: "no-cache" });
    state.drawings = await res.json();
  } catch (e) {
    console.error(e);
  }

  $("#pin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = $("#pin-input")?.value || "";
    await tryUnlock(pin);
  });

  $("#btn-close")?.addEventListener("click", async () => {
    if (!confirm("¿Cerrar la votación? Los maestros verán los 3 ganadores.")) return;
    try {
      await closeVoting();
    } catch (err) {
      alert(err.message || "No se pudo cerrar.");
    }
  });

  $("#btn-open")?.addEventListener("click", async () => {
    if (!confirm("¿Reabrir la votación?")) return;
    try {
      await openVoting();
    } catch (err) {
      alert(err.message || "No se pudo reabrir.");
    }
  });

  $("#btn-logout")?.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    state.unlocked = false;
    render();
  });

  if (isFirebaseConfigured()) {
    initFirebase();
    await ensureMetaDefaults();
    watchMeta((meta) => {
      state.meta = meta;
      render();
    });
    watchVotes((votes) => {
      state.votes = votes;
      render();
    });
  }

  render();
  document.body.classList.add("is-ready");
}

boot();
