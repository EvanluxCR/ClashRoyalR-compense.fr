const form = document.querySelector("#tracker-form");
const input = document.querySelector("#tag-input");
const stateEl = document.querySelector("#state");
const card = document.querySelector("#profile-card");
const cardFilter = document.querySelector("#card-filter");

let renderedCards = [];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tag = normalizeTag(input.value);
  if (!tag) {
    showError("Tag invalide. Utilise uniquement les caractères du tag Clash Royale.");
    return;
  }

  card.classList.remove("is-visible");
  stateEl.className = "state-msg";
  stateEl.textContent = "Chargement du profil…";

  try {
    const res = await fetch(`${API_BASE}/player/${encodeURIComponent(tag)}/full`);
    const payload = await safeJson(res);

    if (!res.ok) {
      if (res.status === 404) throw new Error("Joueur introuvable. Vérifie le tag.");
      throw new Error(payload?.detail || payload?.error || `Erreur HTTP ${res.status}`);
    }

    renderFullPlayer(payload);
    stateEl.className = "state-msg state-msg--success";
    stateEl.textContent = payload.warnings?.length
      ? `Profil chargé. Certaines données secondaires sont momentanément indisponibles.`
      : "Profil chargé.";
  } catch (err) {
    showError(err.message || "Erreur inconnue");
  }
});

cardFilter.addEventListener("input", () => renderCardCollection(renderedCards));

function renderFullPlayer(payload) {
  const player = payload.player || {};
  try {
    const savedTag = String(player.tag || "").replace(/^#/, "");
    if (savedTag) localStorage.setItem("evanlux:lastPlayerTag", savedTag);
  } catch {}
  document.querySelector("#p-name").textContent = player.name || "—";
  document.querySelector("#p-tag").textContent = player.tag || "—";
  document.querySelector("#p-clan").innerHTML = renderClan(player);

  renderStats(player);
  renderPathOfLegend(player);
  renderProgress(player.progress);
  renderFavouriteCard(player.currentFavouriteCard);
  const hasCurrentDeck = renderDeck(player.currentDeck, player.currentDeckSupportCards);
  const hasBestDeck = renderBestRecentDeck(payload.battles || [], player.tag);
  document.querySelector("#p-deck-section").style.display = hasCurrentDeck || hasBestDeck ? "block" : "none";
  renderBattles(payload.battles || [], player.tag);
  renderChests(payload.upcomingChests || []);

  renderedCards = mergeCardCatalog(player.cards || [], payload.cardsCatalog || []);
  renderCardCollection(renderedCards);
  renderSupportCards(player.supportCards || []);
  renderBadges(player.badges || []);
  renderAchievements(player.achievements || []);

  document.querySelector("#p-raw").textContent = JSON.stringify(payload, null, 2);
  document.querySelectorAll(".profile-collapse").forEach(details => { details.open = false; });
  card.classList.add("is-visible");
}

function renderStats(player) {
  const wins = num(player.wins);
  const losses = num(player.losses);
  const decided = wins + losses;
  const winRate = decided ? `${((wins / decided) * 100).toFixed(1)} %` : "—";

  const roleLabels = {
    member: "Membre",
    elder: "Aîné",
    coLeader: "Co-chef",
    leader: "Chef",
    notMember: "Hors clan",
  };

  const stats = [
    ["Trophées", player.trophies],
    ["Record de trophées", player.bestTrophies],
    ["Ancien record de trophées", player.legacyTrophyRoadHighScore],
    ["Arène", player.arena?.name],
    ["Niveau d'XP", player.expLevel],
    ["XP actuelle", player.expPoints],
    ["XP totale", player.totalExpPoints],
    ["Victoires", player.wins],
    ["Défaites", player.losses],
    ["Taux de victoire", winRate],
    ["Combats totaux", player.battleCount],
    ["Victoires 3 couronnes", player.threeCrownWins],
    ["Série actuelle", player.currentWinLoseStreak],
    ["Cartes gagnées en défis", player.challengeCardsWon],
    ["Record victoires défi", player.challengeMaxWins],
    ["Cartes gagnées tournoi", player.tournamentCardsWon],
    ["Combats tournoi", player.tournamentBattleCount],
    ["Dons semaine", player.donations],
    ["Dons reçus", player.donationsReceived],
    ["Dons totaux", player.totalDonations],
    ["Victoires War Day", player.warDayWins],
    ["Cartes clan collectées", player.clanCardsCollected],
    ["Points étoile", player.starPoints],
    ["Rôle clan", player.role ? roleLabels[player.role] || player.role : "—"],
  ];

  document.querySelector("#p-stats").innerHTML = stats.map(statBox).join("");
}

function renderPathOfLegend(player) {
  const results = [
    ["Saison actuelle", player.currentPathOfLegendSeasonResult],
    ["Saison précédente", player.lastPathOfLegendSeasonResult],
    ["Meilleure saison", player.bestPathOfLegendSeasonResult],
  ];

  document.querySelector("#p-pol").innerHTML = results
    .map(([title, r]) => {
      if (!r) return statBox([title, "—"]);
      const details = [
        `Ligue ${value(r.leagueNumber)}`,
        r.trophies != null ? `${formatNumber(r.trophies)} rating/trophées` : null,
        r.rank != null ? `Rang #${formatNumber(r.rank)}` : null,
      ].filter(Boolean).join(" • ");
      return statBox([title, details || "—"]);
    })
    .join("");
}

function renderProgress(progress) {
  const section = document.querySelector("#p-progress-section");
  const el = document.querySelector("#p-progress");
  const entries = Object.entries(progress || {});

  if (!entries.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";

  el.innerHTML = entries.map(([key, p]) => `
    <div class="progress-card">
      <div class="progress-card__title">${escapeHtml(prettyProgressName(key, p))}</div>
      <div>${escapeHtml(p?.arena?.name || "—")}</div>
      <small>${formatNumber(p?.trophies ?? 0)} trophées • record ${formatNumber(p?.bestTrophies ?? 0)}</small>
    </div>
  `).join("");
}

function renderFavouriteCard(fav) {
  const section = document.querySelector("#p-favcard-section");
  const el = document.querySelector("#p-favcard");
  if (!fav) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  el.innerHTML = cardPicture(fav, "fav") + `
    <div>
      <div class="fav-card__name">${escapeHtml(fav.name || "—")}</div>
      <div class="fav-card__meta">${escapeHtml(cardMeta(fav, false))}</div>
    </div>`;
}

function renderDeck(deck, supportDeck) {
  const currentWrap = document.querySelector("#p-current-deck-wrap");
  const el = document.querySelector("#p-deck");
  const supportWrap = document.querySelector("#p-support-deck-wrap");
  const supportEl = document.querySelector("#p-support-deck");

  if (!deck?.length) {
    currentWrap.style.display = "none";
    el.innerHTML = "";
    return false;
  }

  currentWrap.style.display = "block";
  el.innerHTML = deck.map(deckCard).join("");

  if (supportDeck?.length) {
    supportWrap.style.display = "block";
    supportEl.innerHTML = supportDeck.map(deckCard).join("");
  } else {
    supportWrap.style.display = "none";
    supportEl.innerHTML = "";
  }
  return true;
}

function renderBestRecentDeck(battles, playerTag) {
  const wrap = document.querySelector("#p-best-deck-wrap");
  const el = document.querySelector("#p-best-deck");
  const meta = document.querySelector("#p-best-deck-meta");
  const groups = new Map();
  wrap.querySelectorAll(".best-deck-support").forEach(node => node.remove());

  for (const battle of battles || []) {
    const me = findPlayerSide(battle.team, playerTag) || battle.team?.[0];
    const enemy = battle.opponent?.[0] || {};
    if (!me?.cards?.length) continue;

    const cardKey = me.cards
      .map(c => String(c.id ?? c.name ?? ""))
      .sort()
      .join("|");
    const supportKey = (me.supportCards || [])
      .map(c => String(c.id ?? c.name ?? ""))
      .sort()
      .join("|");
    const key = `${cardKey}::${supportKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        cards: me.cards,
        supportCards: me.supportCards || [],
        games: 0, wins: 0, losses: 0, draws: 0,
      });
    }

    const g = groups.get(key);
    g.games++;
    const myCrowns = num(me.crowns);
    const enemyCrowns = num(enemy.crowns);
    if (myCrowns > enemyCrowns) g.wins++;
    else if (myCrowns < enemyCrowns) g.losses++;
    else g.draws++;
  }

  const ranked = [...groups.values()].sort((a, b) => {
    const aRate = a.games ? a.wins / a.games : 0;
    const bRate = b.games ? b.wins / b.games : 0;
    return (b.wins - a.wins) || (bRate - aRate) || (b.games - a.games);
  });

  const best = ranked[0];
  if (!best) {
    wrap.style.display = "none";
    el.innerHTML = "";
    meta.textContent = "";
    return false;
  }

  const winRate = best.games ? ((best.wins / best.games) * 100).toFixed(1) : "0.0";
  meta.textContent = `${best.wins} V • ${best.losses} D${best.draws ? ` • ${best.draws} N` : ""} • ${winRate} % • ${best.games} partie${best.games > 1 ? "s" : ""}`;
  el.innerHTML = best.cards.map(deckCard).join("");
  if (best.supportCards.length) {
    el.insertAdjacentHTML("afterend", `<div class="mini-note best-deck-support">🏰 Support : ${best.supportCards.map(c => escapeHtml(c.name || "—")).join(", ")}</div>`);
  }
  wrap.style.display = "block";
  return true;
}

function renderBattles(battles, playerTag) {
  const section = document.querySelector("#p-battles-section");
  const el = document.querySelector("#p-battles");
  const summary = document.querySelector("#p-battle-summary");
  if (!battles.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";

  let wins = 0, losses = 0, draws = 0;
  const rows = battles.map((battle, index) => {
    const me = findPlayerSide(battle.team, playerTag) || battle.team?.[0] || {};
    const enemy = battle.opponent?.[0] || {};
    const myCrowns = num(me.crowns);
    const enemyCrowns = num(enemy.crowns);
    const outcome = myCrowns > enemyCrowns ? "Victoire" : myCrowns < enemyCrowns ? "Défaite" : "Égalité";
    if (outcome === "Victoire") wins++;
    else if (outcome === "Défaite") losses++;
    else draws++;

    const trophyChange = me.trophyChange;
    const rating = me.startingTrophies;
    return `
      <article class="battle-card battle-card--${outcome === "Victoire" ? "victoire" : outcome === "Défaite" ? "defaite" : "egalite"}">
        <div class="battle-card__top">
          <div>
            <strong>${escapeHtml(outcome)} ${myCrowns}-${enemyCrowns}</strong>
            <span>${escapeHtml(battle.gameMode?.name || battle.type || "Combat")}</span>
          </div>
          <div class="battle-card__right">
            ${battle.leagueNumber != null ? `<span>Ligue ${escapeHtml(battle.leagueNumber)}</span>` : ""}
            ${rating != null ? `<span>Score ${formatNumber(rating)}</span>` : ""}
            ${trophyChange != null ? `<span>${trophyChange >= 0 ? "+" : ""}${escapeHtml(trophyChange)}</span>` : ""}
            <time>${escapeHtml(formatBattleTime(battle.battleTime))}</time>
          </div>
        </div>
        <div class="battle-versus">
          <div>
            <div class="battle-player">${escapeHtml(me.name || "Joueur")} <small>${escapeHtml(me.tag || "")}</small></div>
            <div class="mini-deck">${(me.cards || []).map(miniCard).join("")}</div>
            ${me.supportCards?.length ? `<div class="mini-support">Tour: ${me.supportCards.map(c => escapeHtml(c.name)).join(", ")}</div>` : ""}
          </div>
          <div>
            <div class="battle-player battle-player--enemy">${escapeHtml(enemy.name || "Adversaire")} <small>${escapeHtml(enemy.tag || "")}</small></div>
            <div class="mini-deck">${(enemy.cards || []).map(miniCard).join("")}</div>
            ${enemy.supportCards?.length ? `<div class="mini-support">Tour: ${enemy.supportCards.map(c => escapeHtml(c.name)).join(", ")}</div>` : ""}
          </div>
        </div>
      </article>`;
  });

  summary.textContent = `${wins} V • ${losses} D${draws ? ` • ${draws} N` : ""} sur ${battles.length}`;
  el.innerHTML = rows.join("");
}

function renderChests(chests) {
  const section = document.querySelector("#p-chests-section");
  const el = document.querySelector("#p-chests");
  if (!chests.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  el.innerHTML = chests.map(c => `
    <div class="chest-item">
      <strong>${c.index === 0 ? "Prochain" : `+${escapeHtml(c.index)}`}</strong>
      <span>${escapeHtml(c.name || "Coffre")}</span>
    </div>`).join("");
}

function mergeCardCatalog(ownedCards, catalog) {
  const owned = new Map(ownedCards.map(c => [String(c.id), c]));
  const all = catalog.length ? catalog.map(base => ({ ...base, ...(owned.get(String(base.id)) || {}), locked: !owned.has(String(base.id)) })) : ownedCards.map(c => ({ ...c, locked: false }));
  return all.sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    return (num(b.level) - num(a.level)) || String(a.name).localeCompare(String(b.name), "fr");
  });
}

function renderCardCollection(cards) {
  const el = document.querySelector("#p-cards");
  const summary = document.querySelector("#p-card-summary");
  const q = cardFilter.value.trim().toLowerCase();
  const filtered = cards.filter(c => !q || `${c.name} ${c.rarity || ""}`.toLowerCase().includes(q));
  const unlocked = cards.filter(c => !c.locked).length;
  const evo = cards.filter(c => num(c.evolutionLevel) > 0).length;
  const hero = cards.filter(c => c.iconUrls?.heroMedium).length;
  summary.textContent = `${unlocked}/${cards.length} cartes visibles dans la collection • ${evo} évolution(s) active(s)${hero ? ` • ${hero} carte(s) avec forme héroïque disponible` : ""}`;
  el.innerHTML = filtered.map(collectionCard).join("") || `<div class="empty-note">Aucune carte ne correspond au filtre.</div>`;
}

function renderSupportCards(cards) {
  const section = document.querySelector("#p-support-cards-section");
  const el = document.querySelector("#p-support-cards");
  if (!cards.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  el.innerHTML = cards.sort((a,b) => num(b.level) - num(a.level)).map(collectionCard).join("");
}

function renderBadges(badges) {
  const section = document.querySelector("#p-badges-section");
  const el = document.querySelector("#p-badges");
  if (!badges.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  el.innerHTML = badges.map(b => `
    <div class="detail-card">
      <strong>${escapeHtml(b.name || "Badge")}</strong>
      <span>Niveau ${escapeHtml(b.level ?? "—")} • Progression ${formatNumber(b.progress ?? 0)}</span>
      ${b.maxLevel != null ? `<small>Max ${escapeHtml(b.maxLevel)}</small>` : ""}
      ${b.target != null ? `<small>Objectif ${formatNumber(b.target)}</small>` : ""}
    </div>`).join("");
}

function renderAchievements(items) {
  const section = document.querySelector("#p-achievements-section");
  const el = document.querySelector("#p-achievements");
  if (!items.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  el.innerHTML = items.map(a => `
    <div class="detail-card">
      <strong>${escapeHtml(a.name || "Succès")}</strong>
      <span>${"★".repeat(Math.max(0, num(a.stars)))}${"☆".repeat(Math.max(0, 3 - num(a.stars)))}</span>
      <small>${formatNumber(a.value ?? 0)} / ${formatNumber(a.target ?? 0)}</small>
      ${a.info ? `<small>${escapeHtml(a.info)}</small>` : ""}
    </div>`).join("");
}

function collectionCard(c) {
  const badges = [];
  if (c.locked) badges.push("🔒 Non présente");
  if (num(c.evolutionLevel) > 0) badges.push(`⚡ Évo ${c.evolutionLevel}/${c.maxEvolutionLevel || "?"}`);
  else if (num(c.maxEvolutionLevel) > 0) badges.push(`Évo max ${c.maxEvolutionLevel}`);
  if (num(c.starLevel) > 0) badges.push(`⭐ ${c.starLevel}`);
  if (c.iconUrls?.heroMedium) badges.push("🦸 Héros");

  return `
    <article class="collection-card ${c.locked ? "is-locked" : ""}">
      ${cardPicture(c, "collection")}
      <div class="collection-card__body">
        <strong>${escapeHtml(c.name || "Carte")}</strong>
        <span>${c.locked ? "Non débloquée / absente du profil" : `Niveau ${escapeHtml(c.level ?? "—")} / ${escapeHtml(c.maxLevel ?? "—")}`}</span>
        <small>${escapeHtml(translateRarity(c.rarity))}${c.elixirCost != null ? ` • ${escapeHtml(c.elixirCost)} élixir` : ""}${c.count != null ? ` • ${formatNumber(c.count)} cartes` : ""}</small>
        ${badges.length ? `<div class="card-badges">${badges.map(x => `<em>${escapeHtml(x)}</em>`).join("")}</div>` : ""}
        <small class="card-id">ID ${escapeHtml(c.id ?? "—")}</small>
      </div>
    </article>`;
}

function deckCard(c) {
  return `
    <div class="deck-card">
      ${cardPicture(c, "deck")}
      <div class="deck-card__name">${escapeHtml(c.name || "Carte")}</div>
      <div class="deck-card__level">Niveau ${escapeHtml(c.level ?? "—")} / ${escapeHtml(c.maxLevel ?? "—")}</div>
      ${num(c.evolutionLevel) > 0 ? `<div class="deck-card__evo">⚡ Évo ${escapeHtml(c.evolutionLevel)}</div>` : ""}
      ${c.elixirCost != null ? `<div class="deck-card__elixir">💧 ${escapeHtml(c.elixirCost)}</div>` : ""}
    </div>`;
}

function miniCard(c) {
  const icon = c.iconUrls?.medium;
  return `<div class="mini-card" title="${escapeHtml(`${c.name || "Carte"} — niveau ${c.level ?? "?"}`)}">
    ${icon ? `<img src="${safeUrl(icon)}" alt="${escapeHtml(c.name || "Carte")}" loading="lazy">` : ""}
    <span>${escapeHtml(c.level ?? "—")}${num(c.evolutionLevel) > 0 ? "⚡" : ""}</span>
  </div>`;
}

function cardPicture(c, kind) {
  const normal = c.iconUrls?.medium;
  const evo = num(c.evolutionLevel) > 0 ? c.iconUrls?.evolutionMedium : null;
  const hero = c.iconUrls?.heroMedium;
  const src = evo || hero || normal;
  if (!src) return "";
  return `<img class="card-img card-img--${kind}" src="${safeUrl(src)}" alt="${escapeHtml(c.name || "Carte")}" loading="lazy">`;
}

function renderClan(player) {
  if (!player.clan) return `<span class="pill-lite">Sans clan</span>`;
  return `<span class="pill-lite">👥 ${escapeHtml(player.clan.name)} <small>${escapeHtml(player.clan.tag || "")}</small></span>`;
}

function cardMeta(c, includeLevel = true) {
  const bits = [translateRarity(c.rarity)];
  if (includeLevel && c.level != null) bits.push(`niveau ${c.level}/${c.maxLevel ?? "?"}`);
  if (c.elixirCost != null) bits.push(`${c.elixirCost} élixir`);
  if (c.maxEvolutionLevel) bits.push(`évolution max ${c.maxEvolutionLevel}`);
  return bits.filter(Boolean).join(" • ");
}

function statBox([label, raw]) {
  const display = raw === null || raw === undefined || raw === "" ? "—" : typeof raw === "number" ? formatNumber(raw) : String(raw);
  return `<div class="stat-box"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(display)}</div></div>`;
}

function prettyProgressName(key, p) {
  if (key === "") return "Mode annexe";
  if (key.startsWith("2v2League_")) return `2v2 League ${key.slice(-6)}`;
  if (key.startsWith("AutoChess_")) return key.replaceAll("_", " ");
  if (key.startsWith("seasonal-trophy-road-")) return `Voie saisonnière ${key.split("-").pop()}`;
  return p?.arena?.rawName || key;
}

function findPlayerSide(team, tag) {
  const normalized = normalizeTag(tag || "");
  return (team || []).find(p => normalizeTag(p.tag || "") === normalized);
}

function formatBattleTime(raw) {
  if (!raw) return "—";
  const m = String(raw).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return raw;
  const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]));
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function translateRarity(rarity) {
  const map = { common: "Commune", rare: "Rare", epic: "Épique", legendary: "Légendaire", champion: "Champion" };
  return map[String(rarity || "").toLowerCase()] || rarity || "Rareté inconnue";
}

function normalizeTag(raw) {
  return String(raw || "").replace(/#/g, "").trim().toUpperCase();
}

function showError(message) {
  stateEl.className = "state-msg state-msg--error";
  stateEl.textContent = `❌ ${message}`;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function formatNumber(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(v));
}

function num(v) { return Number(v) || 0; }
function value(v) { return v === null || v === undefined ? "—" : v; }

function safeUrl(value) {
  const s = String(value || "");
  return /^https:\/\//i.test(s) ? s.replaceAll('"', "%22") : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Préremplit et lance automatiquement une recherche depuis ?tag=XXXX.
(() => {
  const tag = new URLSearchParams(location.search).get("tag");
  if (tag) {
    input.value = `#${normalizeTag(tag)}`;
    form.requestSubmit();
  }
})();
