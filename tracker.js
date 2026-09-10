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

  const roleLabels = {
    member: "Membre",
    elder: "Aîné",
    coLeader: "Co-chef",
    leader: "Chef",
  };

  const currentSeason =
    player.leagueStatistics && player.leagueStatistics.currentSeason;
  const pathOfLegend = player.currentPathOfLegendSeasonResult;

  const stats = [
    { label: "Trophées", value: player.trophies },
    { label: "Record perso", value: player.bestTrophies },
    { label: "Niveau d'XP", value: player.expLevel },
    { label: "Victoires", value: player.wins },
    { label: "Défaites", value: player.losses },
    { label: "Victoires 3 couronnes", value: player.threeCrownWins },
    { label: "Clan", value: player.clan ? player.clan.name : "Aucun" },
    {
      label: "Rôle dans le clan",
      value: player.role ? roleLabels[player.role] || player.role : "—",
    },
    { label: "Arène", value: player.arena ? player.arena.name : "—" },
    {
      label: "Trophées classés (saison)",
      value: pathOfLegend ? pathOfLegend.trophies : currentSeason ? currentSeason.trophies : "—",
    },
    { label: "Dons donnés", value: player.donations },
    { label: "Dons reçus", value: player.donationsReceived },
    { label: "Dons totaux", value: player.totalDonations },
    { label: "Points étoile", value: player.starPoints },
    { label: "Cartes du clan collectées", value: player.clanCardsCollected },
    { label: "Victoires en guerre", value: player.warDayWins },
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

  renderFavouriteCard(player.currentFavouriteCard);
  renderDeck(player.currentDeck);

  card.classList.add("is-visible");
}

function renderFavouriteCard(fav) {
  const section = document.querySelector("#p-favcard-section");
  const el = document.querySelector("#p-favcard");

  if (!fav) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const icon = fav.iconUrls ? fav.iconUrls.medium : "";

  el.innerHTML = `
    ${icon ? `<img src="${icon}" alt="${escapeHtml(fav.name)}" loading="lazy">` : ""}
    <div>
      <div class="fav-card__name">${escapeHtml(fav.name)}</div>
      <div class="fav-card__meta">Niveau max : ${escapeHtml(fav.maxLevel ?? "—")}</div>
    </div>
  `;
}

function renderDeck(deck) {
  const section = document.querySelector("#p-deck-section");
  const el = document.querySelector("#p-deck");

  if (!deck || !deck.length) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  el.innerHTML = deck
    .map((c) => {
      const icon = c.iconUrls ? c.iconUrls.medium : "";
      const level = c.maxLevel ? c.maxLevel - (c.maxLevel - c.level) : c.level;
      return `
        <div class="deck-card">
          ${icon ? `<img src="${icon}" alt="${escapeHtml(c.name)}" loading="lazy">` : ""}
          <div class="deck-card__name">${escapeHtml(c.name)}</div>
          <div class="deck-card__level">Niveau ${escapeHtml(level ?? "—")}</div>
          ${
            typeof c.elixirCost === "number"
              ? `<div class="deck-card__elixir">💧 ${c.elixirCost}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
