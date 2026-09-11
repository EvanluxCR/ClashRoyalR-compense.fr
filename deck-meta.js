const arenaSelect = document.querySelector("#arena-select");
const trophyInput = document.querySelector("#trophy-input");
const detectArenaBtn = document.querySelector("#detect-arena-btn");
const playerTagInput = document.querySelector("#meta-player-tag");
const detectPlayerBtn = document.querySelector("#detect-player-btn");
const sortSelect = document.querySelector("#sort-select");
const timeSelect = document.querySelector("#time-select");
const limitSelect = document.querySelector("#deck-limit-select");
const refreshBtn = document.querySelector("#meta-refresh-btn");
const stateEl = document.querySelector("#meta-state");
const gridEl = document.querySelector("#meta-grid");
const contextEl = document.querySelector("#meta-context");

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: { Accept: "application/json", ...(options.headers || {}) },
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { detail: text }; }
    if (!res.ok) throw new Error(data?.detail || data?.error || `Erreur HTTP ${res.status}`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Le serveur met trop de temps à répondre. Réessaie.");
    if (/Failed to fetch/i.test(String(error?.message || error))) {
      throw new Error("Connexion au serveur impossible. Vérifie que le Worker V8 est bien déployé puis recharge la page.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const ARENAS = [
  { id: 1, min: 0, max: 300, name: "Goblin Stadium" },
  { id: 2, min: 300, max: 600, name: "Bone Pit" },
  { id: 3, min: 600, max: 1000, name: "Barbarian Bowl" },
  { id: 4, min: 1000, max: 1300, name: "Spell Valley" },
  { id: 5, min: 1300, max: 1600, name: "Builder's Workshop" },
  { id: 6, min: 1600, max: 2000, name: "P.E.K.K.A.'s Playhouse" },
  { id: 7, min: 2000, max: 2300, name: "Royal Arena" },
  { id: 8, min: 2300, max: 2600, name: "Frozen Peak" },
  { id: 9, min: 2600, max: 3000, name: "Jungle Arena" },
  { id: 10, min: 3000, max: 3400, name: "Hog Mountain" },
  { id: 11, min: 3400, max: 3800, name: "Electro Valley" },
  { id: 12, min: 3800, max: 4200, name: "Spooky Town" },
  { id: 13, min: 4200, max: 4600, name: "Rascal's Hideout" },
  { id: 14, min: 4600, max: 5000, name: "Serenity Peak" },
  { id: 15, min: 5000, max: 5500, name: "Miner's Mine" },
  { id: 16, min: 5500, max: 6000, name: "Executioner's Kitchen" },
  { id: 17, min: 6000, max: 6500, name: "Royal Crypt" },
  { id: 18, min: 6500, max: 7000, name: "Silent Sanctuary" },
  { id: 19, min: 7000, max: 7500, name: "Dragon Spa" },
  { id: 20, min: 7500, max: 8000, name: "Boot Camp" },
  { id: 21, min: 8000, max: 8500, name: "Clash Fest" },
  { id: 22, min: 8500, max: 9000, name: "PANCAKES!" },
  { id: 23, min: 9000, max: 9500, name: "Valkalla" },
  { id: 24, min: 9500, max: 10000, name: "Legendary Arena" },
  { id: 25, min: 10000, max: 10500, name: "Lumberlove Cabin" },
  { id: 26, min: 10500, max: 11000, name: "Royal Road" },
  { id: 27, min: 11000, max: 11500, name: "Musketeer Street" },
  { id: 28, min: 11500, max: 12000, name: "Summit of Heroes" },
  { id: 29, min: 12000, max: 12500, name: "Magic Academy" },
  { id: 30, min: 12500, max: 13000, name: "Ultimate Clash Pit" },
  { id: 31, min: 13000, max: 13500, name: "Little Prince's Tavern" },
  { id: 32, min: 13500, max: 14000, name: "Spirit Square" },
];

const META_SCOPES = {
  ranked: { label: "⚔️ Classé — toutes les ligues" },
  "uc-all": { label: "👑 Champion suprême — tous les ratings" },
  "uc-0-2000": { label: "👑 Champion suprême — 0 à 1 999" },
  "uc-2000-2500": { label: "👑 Champion suprême — 2 000 à 2 499" },
  "uc-2500-3000": { label: "👑 Champion suprême — 2 500 à 2 999" },
  "uc-3000-plus": { label: "👑 Champion suprême — 3 000+" },
  seasonal1: { label: "🌿 Voie saisonnière — Arène I (14 000 → 14 499)" },
  seasonal2: { label: "🔥 Voie saisonnière — Arène II (14 500 → 14 999)" },
  "seasonal-top": { label: "🏅 Voie saisonnière — 15 000+" },
  all: { label: "🏆 Toute la Voie des trophées" },
};

const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="150" height="180" viewBox="0 0 150 180">
    <rect width="150" height="180" rx="14" fill="#0b1d3a"/>
    <text x="75" y="92" text-anchor="middle" fill="#6dbbff" font-family="Arial" font-size="38">?</text>
  </svg>`);

let cardsCatalog = [];
let cardBySlug = new Map();

function initArenaSelect() {
  const rankedOptions = [
    `<option value="ranked">⚔️ Classé — toutes les ligues</option>`,
    `<option value="uc-all">👑 Champion suprême — tous les ratings</option>`,
    `<option value="uc-0-2000">👑 UC — rating 0–1 999</option>`,
    `<option value="uc-2000-2500">👑 UC — rating 2 000–2 499</option>`,
    `<option value="uc-2500-3000">👑 UC — rating 2 500–2 999</option>`,
    `<option value="uc-3000-plus">👑 UC — rating 3 000+</option>`,
  ].join("");

  const seasonalOptions = [
    `<option value="seasonal1">🌿 Saisonnière I — 14 000–14 499</option>`,
    `<option value="seasonal2">🔥 Saisonnière II — 14 500–14 999</option>`,
    `<option value="seasonal-top">🏅 Saisonnière — 15 000+</option>`,
  ].join("");

  const arenaOptions = [
    `<option value="all">🏆 Toute la Voie des trophées</option>`,
    ...[...ARENAS].reverse().map(a =>
      `<option value="${a.id}">Arène ${a.id} — ${escapeHtml(a.name)} (${formatNumber(a.min)}–${formatNumber(a.max)})</option>`
    )
  ].join("");

  arenaSelect.innerHTML = `
    <optgroup label="Mode Classé">${rankedOptions}</optgroup>
    <optgroup label="Voie des trophées saisonnière">${seasonalOptions}</optgroup>
    <optgroup label="Voie des trophées">${arenaOptions}</optgroup>
  `;
}

async function ensureCardCatalog() {
  if (cardsCatalog.length) return;
  try {
    const data = await fetchJson(`${API_BASE}/cards?v=8`);
    cardsCatalog = Array.isArray(data?.items) ? data.items : [];
    cardBySlug = new Map();
    for (const card of cardsCatalog) {
      cardBySlug.set(slugify(card.name), card);
    }
  } catch {
    cardsCatalog = [];
    cardBySlug = new Map();
  }
}

async function loadMeta() {
  gridEl.innerHTML = "";
  stateEl.className = "state-msg";
  stateEl.textContent = "Chargement des decks meta...";
  refreshBtn.disabled = true;

  try {
    await ensureCardCatalog();
    const params = new URLSearchParams({
      arena: arenaSelect.value,
      sort: sortSelect.value,
      time: timeSelect.value,
      limit: limitSelect.value,
    });
    const seedTag = normalizePlayerTag(playerTagInput?.value || localStorage.getItem("evanlux:lastPlayerTag") || "");
    if (seedTag) params.set("seedTag", seedTag);

    params.set("v", "8");
    const data = await fetchJson(`${API_BASE}/meta-decks?${params.toString()}`);

    const decks = Array.isArray(data?.decks) ? data.decks : [];
    if (!decks.length) throw new Error("Aucun deck meta trouvé pour ce filtre.");

    renderContext(data);
    gridEl.innerHTML = decks.map((deck, index) => renderMetaDeck(deck, index, data)).join("");
    bindImageFallbacks();
    bindStatsToggles();

    stateEl.className = data.estimated ? "state-msg" : "state-msg state-msg--success";
    const sampleText = data.sampledBattles != null ? ` • ${formatNumber(data.sampledBattles)} combats analysés` : "";
    stateEl.textContent = data.estimated
      ? `ℹ️ ${decks.length} decks affichés — estimation sur données officielles${sampleText}.`
      : `✅ ${decks.length} decks chargés — API officielle Clash Royale${sampleText}.`;
  } catch (err) {
    contextEl.innerHTML = "";
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = `❌ ${err.message}`;
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderContext(data) {
  const arena = data.arena && typeof data.arena === "object" ? data.arena : null;
  const chips = [];

  if (data.scopeLabel) chips.push(data.scopeLabel);
  else if (data.mode === "ranked") chips.push("⚔️ Classé");
  else if (arena) chips.push(`🏟️ Arène ${arena.id} — ${arena.name}`);
  else chips.push("🏆 Voie des trophées");

  if (arena) chips.push(`🏆 ${formatNumber(arena.min)}–${formatNumber(arena.max)} trophées`);
  if (data.trophyRange) chips.push(`🏆 ${formatRange(data.trophyRange.min, data.trophyRange.max)}`);
  if (data.rankedRange) chips.push(`📈 Rating ${formatRange(data.rankedRange.min, data.rankedRange.max)}`);
  chips.push(`🕒 ${timeLabel(data.time)}`);
  chips.push(`📊 ${sortLabel(data.sort)}`);
  if (data.matchingBattles != null) chips.push(`🎯 ${formatNumber(data.matchingBattles)} combats correspondants`);
  if (data.estimated) chips.push("ℹ️ Estimation");
  if (data.fetchedAt) chips.push(`🔄 ${formatDateTime(data.fetchedAt)}`);

  contextEl.innerHTML = chips.map(x => `<span class="meta-chip">${escapeHtml(x)}</span>`).join("");
  if (data.estimated && data.estimateReason) {
    contextEl.insertAdjacentHTML("beforeend", `<div class="meta-estimate-note">${escapeHtml(data.estimateReason)}</div>`);
  }
}

function renderMetaDeck(deck, index, data = {}) {
  const cards = Array.isArray(deck.cards) ? deck.cards : [];
  const deckName = deck.name || inferDeckName(cards) || `Deck #${index + 1}`;
  const rating = numberOrNull(deck.rating);
  const winRate = numberOrNull(deck.winRate);
  const usage = numberOrNull(deck.usage);
  const wins = numberOrNull(deck.wins);
  const draws = numberOrNull(deck.draws);
  const losses = numberOrNull(deck.losses);
  const lossRate = numberOrNull(deck.lossRate);
  const drawRate = numberOrNull(deck.drawRate);
  const avgElixir = calculateAverageElixir(cards);
  const gameLink = buildGameDeckLink(cards);
  const statsId = `deck-stats-${index}`;

  return `
    <article class="meta-deck-card">
      <div class="meta-deck-head">
        <span class="meta-rank">#${escapeHtml(deck.rank ?? index + 1)}</span>
        <div class="meta-deck-title">
          <h3>${escapeHtml(deckName)}</h3>
          <div class="meta-deck-stats">
            ${rating != null ? `<span>⭐ Note ${formatNumber(rating)}</span>` : ""}
            ${winRate != null ? `<span>🔥 ${formatPercent(winRate)} victoires</span>` : ""}
            ${usage != null ? `<span>⚔️ ${formatNumber(usage)} parties</span>` : ""}
            ${avgElixir != null ? `<span>💧 ${avgElixir.toFixed(1)} élixir</span>` : ""}
          </div>
        </div>
      </div>

      <div class="meta-card-row">
        ${cards.map(card => renderMetaCard(card)).join("")}
      </div>

      <div class="meta-deck-actions">
        ${gameLink ? `<a class="btn btn--primary meta-small-btn" href="${escapeAttr(gameLink)}">🎮 Ouvrir dans Clash Royale</a>` : ""}
        <button class="btn btn--secondary meta-small-btn meta-stats-toggle" type="button" aria-expanded="false" aria-controls="${statsId}">📊 Voir les stats <span class="meta-toggle-arrow">▾</span></button>
      </div>

      <div id="${statsId}" class="meta-stats-panel" hidden>
        <div class="meta-stats-grid">
          <div><strong>${usage != null ? formatNumber(usage) : "—"}</strong><span>Parties</span></div>
          <div><strong>${wins != null ? formatNumber(wins) : "—"}</strong><span>Victoires</span></div>
          <div><strong>${losses != null ? formatNumber(losses) : "—"}</strong><span>Défaites</span></div>
          <div><strong>${draws != null ? formatNumber(draws) : "—"}</strong><span>Égalités</span></div>
          <div><strong>${winRate != null ? formatPercent(winRate) : "—"}</strong><span>Win rate</span></div>
          <div><strong>${lossRate != null ? formatPercent(lossRate) : "—"}</strong><span>Loss rate</span></div>
          <div><strong>${drawRate != null ? formatPercent(drawRate) : "—"}</strong><span>Draw rate</span></div>
          <div><strong>${rating != null ? formatNumber(rating) : "—"}</strong><span>Note</span></div>
        </div>
        <p class="meta-stats-source">Statistiques calculées directement sur les combats récents disponibles via l’API officielle Clash Royale${data.estimated ? " (estimation pour cette tranche)" : ""}. Échantillon : ${formatNumber(data.sampledPlayers || 0)} joueurs / ${formatNumber(data.sampledBattles || 0)} combats analysés.</p>
      </div>
    </article>`;
}

function bindStatsToggles() {
  document.querySelectorAll(".meta-stats-toggle").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      if (!panel) return;
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      const arrow = button.querySelector(".meta-toggle-arrow");
      if (arrow) arrow.textContent = open ? "▾" : "▴";
      button.firstChild.textContent = open ? "📊 Voir les stats " : "📊 Masquer les stats ";
    });
  });
}

function renderMetaCard(card) {
  const rawSlug = typeof card === "string" ? card : card?.slug || "";
  const baseSlug = baseCardSlug(rawSlug);
  const catalogCard = cardBySlug.get(baseSlug);
  const name = catalogCard?.name || prettySlug(baseSlug || rawSlug);
  const officialImg = catalogCard?.iconUrls?.medium;
  const royaleImg = rawSlug ? `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/cards/150/${encodeURIComponent(rawSlug)}.png` : "";
  const image = officialImg || royaleImg || FALLBACK_IMAGE;
  const variant = /-ev\d+$/i.test(rawSlug) ? "⚡ Évolution" : /-hero$/i.test(rawSlug) ? "🦸 Héros" : "";

  return `
    <div class="meta-card" title="${escapeAttr(name)}${variant ? ` — ${variant}` : ""}">
      <img src="${escapeAttr(image)}" data-base-slug="${escapeAttr(baseSlug)}" alt="${escapeAttr(name)}" loading="lazy">
      ${variant ? `<span>${escapeHtml(variant.includes("Évolution") ? "⚡" : "🦸")}</span>` : ""}
    </div>`;
}

function bindImageFallbacks() {
  document.querySelectorAll(".meta-card img").forEach(img => {
    img.addEventListener("error", () => {
      if (img.dataset.triedBase !== "1" && img.dataset.baseSlug) {
        img.dataset.triedBase = "1";
        img.src = `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/cards/150/${encodeURIComponent(img.dataset.baseSlug)}.png`;
      } else {
        img.onerror = null;
        img.src = FALLBACK_IMAGE;
      }
    }, { once: false });
  });
}

function detectArenaFromTrophies() {
  const trophies = Number(trophyInput.value);
  if (!Number.isFinite(trophies) || trophies < 0) return;

  if (trophies >= 15000) {
    arenaSelect.value = "seasonal-top";
  } else if (trophies >= 14500) {
    arenaSelect.value = "seasonal2";
  } else if (trophies >= 14000) {
    arenaSelect.value = "seasonal1";
  } else {
    const arena = ARENAS.find((a, i) => trophies >= a.min && (trophies < a.max || i === ARENAS.length - 1));
    if (!arena) return;
    arenaSelect.value = String(arena.id);
  }
  loadMeta();
}

function normalizePlayerTag(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/[^0289PYLQGRJCUV]/g, "");
}

function pickScopeFromRating(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return "uc-all";
  if (value >= 3000) return "uc-3000-plus";
  if (value >= 2500) return "uc-2500-3000";
  if (value >= 2000) return "uc-2000-2500";
  return "uc-0-2000";
}

function seasonalProgress(player) {
  const entries = Object.entries(player?.progress || {});
  for (const [key, progress] of entries) {
    const raw = String(progress?.arena?.rawName || "");
    const name = String(progress?.arena?.name || "");
    if (String(key).includes("seasonal-trophy-road") || raw.startsWith("SeasonalArenas_") || /Seasonal Arena/i.test(name)) {
      return progress;
    }
  }
  return null;
}

async function detectFromPlayer() {
  const tag = normalizePlayerTag(playerTagInput.value);
  if (!tag) {
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = "❌ Entre un tag joueur valide.";
    return;
  }

  detectPlayerBtn.disabled = true;
  stateEl.className = "state-msg";
  stateEl.textContent = "Analyse du niveau du joueur...";

  try {
    const player = await fetchJson(`${API_BASE}/player/${encodeURIComponent(tag)}?v=8`);

    try { localStorage.setItem("evanlux:lastPlayerTag", tag); } catch {}

    const ranked = player?.currentPathOfLegendSeasonResult || null;
    const league = Number(ranked?.leagueNumber);
    const rankedRating = Number(ranked?.trophies);
    const seasonal = seasonalProgress(player);
    const seasonalTrophies = Number(seasonal?.trophies);
    const seasonalArena = String(seasonal?.arena?.name || seasonal?.arena?.rawName || "");

    // Si le joueur est Champion suprême avec un rating, on choisit automatiquement
    // la tranche UC correspondante. Pour les autres ligues, RoyaleAPI fournit une
    // meta Ranked globale mais pas une séparation fiable par chaque ligue.
    if (Number.isFinite(league) && league >= 7 && Number.isFinite(rankedRating) && rankedRating > 0) {
      arenaSelect.value = pickScopeFromRating(rankedRating);
    } else if (Number.isFinite(league) && league > 1) {
      arenaSelect.value = "ranked";
    } else if (/Arena II/i.test(seasonalArena) || (Number.isFinite(seasonalTrophies) && seasonalTrophies >= 14500)) {
      arenaSelect.value = seasonalTrophies >= 15000 ? "seasonal-top" : "seasonal2";
    } else if (/Arena I/i.test(seasonalArena) || (Number.isFinite(seasonalTrophies) && seasonalTrophies >= 14000)) {
      arenaSelect.value = "seasonal1";
    } else {
      const trophies = Number(player?.trophies);
      const arena = ARENAS.find((a, i) => trophies >= a.min && (trophies < a.max || i === ARENAS.length - 1));
      arenaSelect.value = arena ? String(arena.id) : "all";
    }

    await loadMeta();
  } catch (err) {
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = `❌ ${err.message || "Impossible d'analyser ce joueur."}`;
  } finally {
    detectPlayerBtn.disabled = false;
  }
}

function buildGameDeckLink(cards) {
  const ids = [];
  for (const raw of cards) {
    const slug = baseCardSlug(typeof raw === "string" ? raw : raw?.slug || "");
    const card = cardBySlug.get(slug);
    if (!card?.id) return "";
    ids.push(card.id);
  }
  if (ids.length !== 8) return "";
  return `https://link.clashroyale.com/deck/fr?deck=${ids.join(";")}`;
}

function calculateAverageElixir(cards) {
  const costs = cards.map(raw => {
    const slug = baseCardSlug(typeof raw === "string" ? raw : raw?.slug || "");
    const value = cardBySlug.get(slug)?.elixirCost;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }).filter(v => v != null);
  if (costs.length !== 8) return null;
  return costs.reduce((a, b) => a + b, 0) / costs.length;
}

function inferDeckName(cards) {
  const names = cards.slice(0, 3).map(raw => {
    const slug = baseCardSlug(typeof raw === "string" ? raw : raw?.slug || "");
    return cardBySlug.get(slug)?.name || prettySlug(slug);
  }).filter(Boolean);
  return names.length ? names.join(" • ") : "";
}

function baseCardSlug(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/-ev\d+$/i, "")
    .replace(/-hero$/i, "")
    .replace(/-evolution$/i, "");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettySlug(slug) {
  return String(slug || "Carte")
    .split("-")
    .filter(Boolean)
    .map(x => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function formatNumber(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(v));
}
function formatPercent(v) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(v))}%`;
}
function formatRange(min, max) {
  const left = Number.isFinite(Number(min)) ? formatNumber(min) : "0";
  if (max === null || max === undefined || !Number.isFinite(Number(max))) return `${left}+`;
  return `${left}–${formatNumber(max)}`;
}
function timeLabel(v) {
  return v === "1d" ? "24 h" : v === "3d" ? "3 jours" : "7 jours";
}
function sortLabel(v) {
  return v === "win" ? "% victoire" : v === "pop" ? "popularité" : "meilleure note";
}
function formatDateTime(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "maintenant" : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(value) { return escapeHtml(value); }

arenaSelect.addEventListener("change", loadMeta);
sortSelect.addEventListener("change", loadMeta);
timeSelect.addEventListener("change", loadMeta);
limitSelect.addEventListener("change", loadMeta);
refreshBtn.addEventListener("click", loadMeta);
detectArenaBtn.addEventListener("click", detectArenaFromTrophies);
detectPlayerBtn.addEventListener("click", detectFromPlayer);
playerTagInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    detectFromPlayer();
  }
});
trophyInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    detectArenaFromTrophies();
  }
});

initArenaSelect();
try {
  const savedTag = localStorage.getItem("evanlux:lastPlayerTag");
  if (savedTag) playerTagInput.value = `#${savedTag}`;
} catch {}
loadMeta();
