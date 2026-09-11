const stateEl = document.querySelector("#state");
const table = document.querySelector("#leaderboard-table");
const thead = document.querySelector("#leaderboard-head");
const tbody = document.querySelector("#leaderboard-body");
const regionSelect = document.querySelector("#region-select");
const limitSelect = document.querySelector("#limit-select");
const refreshBtn = document.querySelector("#refresh-btn");

async function loadLeaderboard() {
  table.style.display = "none";
  stateEl.className = "state-msg";
  stateEl.textContent = "Chargement du classement Ranked...";

  const requestedLimit = Number(limitSelect.value) || 200;
  const region = regionSelect.value;

  try {
    const url = `${API_BASE}/leaderboard?country=${encodeURIComponent(region)}&limit=${requestedLimit}`;
    const res = await fetch(url);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.detail || data?.error || `Erreur HTTP ${res.status}`);

    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) throw new Error("Le classement Ranked est vide pour cette région.");

    renderLeaderboard(items);
    table.style.display = "table";
    stateEl.className = "state-msg state-msg--success";

    const exhaustedText = data?.exhausted && items.length < requestedLimit
      ? ` L’API ne renvoie actuellement que ${items.length} joueur${items.length > 1 ? "s" : ""} pour ce classement.`
      : "";
    stateEl.textContent = `✅ ${items.length} joueurs chargés — Ranked / Path of Legend.${exhaustedText}`;
  } catch (err) {
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = `❌ ${err.message}`;
  }
}

function renderLeaderboard(items) {
  thead.innerHTML = `<tr><th>#</th><th>Joueur</th><th>Tag</th><th>Clan</th><th>Ligue</th><th>Rating</th></tr>`;
  tbody.innerHTML = items.map(p => `
    <tr>
      <td class="rank">#${escapeHtml(p.rank ?? "—")}</td>
      <td><a class="player-link" href="tracker.html?tag=${encodeURIComponent(String(p.tag || "").replace("#", ""))}">${escapeHtml(p.name || "—")}</a></td>
      <td class="tag-cell">${escapeHtml(p.tag || "—")}</td>
      <td>${escapeHtml(p.clan?.name || "—")}</td>
      <td>${p.leagueNumber != null ? `Ligue ${escapeHtml(p.leagueNumber)}` : "—"}</td>
      <td class="rating">⚔️ ${formatNumber(p.eloRating ?? p.trophies)}</td>
    </tr>`).join("");
}

regionSelect.addEventListener("change", loadLeaderboard);
limitSelect.addEventListener("change", loadLeaderboard);
refreshBtn.addEventListener("click", loadLeaderboard);
loadLeaderboard();

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}
function formatNumber(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(v));
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
