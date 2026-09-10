const form = document.querySelector("#tracker-form");
const input = document.querySelector("#tag-input");
const stateEl = document.querySelector("#state");
const card = document.querySelector("#profile-card");

const nameEl = document.querySelector("#p-name");
const tagEl = document.querySelector("#p-tag");
const statsEl = document.querySelector("#p-stats");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;

  const tag = raw.replace("#", "").toUpperCase();

  card.classList.remove("is-visible");
  stateEl.className = "state-msg";
  stateEl.textContent = "Recherche en cours...";

  try {
    const res = await fetch(`${API_BASE}/player/${encodeURIComponent(tag)}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error("Joueur introuvable. Vérifie le tag.");
      throw new Error("Erreur lors de la récupération des données.");
    }
    const player = await res.json();
    renderPlayer(player);
    stateEl.textContent = "";
  } catch (err) {
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = `❌ ${err.message}`;
  }
});

function renderPlayer(player) {
  nameEl.textContent = player.name || "—";
  tagEl.textContent = player.tag || "—";

  const stats = [
    { label: "Trophées", value: player.trophies },
    { label: "Record perso", value: player.bestTrophies },
    { label: "Niveau", value: player.expLevel },
    { label: "Victoires", value: player.wins },
    { label: "Défaites", value: player.losses },
    { label: "Victoires 3 couronnes", value: player.threeCrownWins },
    { label: "Clan", value: player.clan ? player.clan.name : "Aucun" },
    { label: "Dons totaux", value: player.totalDonations },
  ];

  statsEl.innerHTML = stats
    .map(
      (s) => `
      <div class="stat-box">
        <div class="label">${escapeHtml(s.label)}</div>
        <div class="value">${escapeHtml(s.value ?? "—")}</div>
      </div>
    `
    )
    .join("");

  card.classList.add("is-visible");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
