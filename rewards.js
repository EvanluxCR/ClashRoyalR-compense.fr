/*
  Récompenses EVANLUX — V6
  --------------------------------------------
  Le site tente d'abord de charger automatiquement les récompenses
  actuellement listées comme actives par la source publique RoyaleAPI.
  Les cartes ci-dessous servent uniquement de secours si la source est indisponible.
*/

const FALLBACK_REWARDS = [
  { title: "Bannière x2", description: "2 bannières à récupérer", link: "https://link.clashroyale.com/en/?action=voucher&code=819f7582-9242-444a-a6bf-9ea3efa913e3" },
  { title: "Emote x1", description: "1 Emote à récupérer", link: "https://on.royaleapi.com/s84prsnore" },
  { title: "Emote x1", description: "1 Emote à récupérer", link: "https://link.clashroyale.com/en/?action=voucher&code=6884f0e3-367c-4449-93ef-fb4e17ac55a1" },
  { title: "Or x1000", description: "1000 Or à récupérer", link: "https://link.clashroyale.com/en/?action=voucher&code=2c13ee10-68de-4cc6-940e-57cfb9aebb0c" },
  { title: "Bannière x1", description: "1 bannière à récupérer", link: "https://link.clashroyale.com/en/?action=voucher&code=80486871-5620-4237-83fb-42174ddc8a83" },
  { title: "Emote x1", description: "1 Emote à récupérer", link: "https://link.clashroyale.com/de/?action=voucher&code=bf578c2b-bc44-4312-8c61-5e513b6fb817" },
  { title: "Bannière x2", description: "2 bannières à récupérer", link: "https://bit.ly/4yChG9p?r=qr" },
  { title: "Bannière x2", description: "2 bannières à récupérer", link: "https://bit.ly/47j8tH6?r=qr" },
  { title: "Emote x1", description: "1 Emote à récupérer", link: "https://link.clashroyale.com/?action=voucher&code=4e2bceb9-d231-4d54-a331-5b8d08005c86" },
  { title: "Emote x1", description: "1 Emote à récupérer", link: "https://bit.ly/4dTNIFx?r=qr" },
  { title: "Skin de tour x1 + Emote x1", description: "1 skin de tour avec 1 emote à récupérer", link: "https://store.supercell.com/clashroyale?boost=Tryaz" },
  { title: "Bannière x2", description: "2 bannières à récupérer", link: "https://supr.cl/4cZS8tA?r=qr" }
];

const socials = {
  twitch: "https://www.twitch.tv/evanlux",
  tiktok: "https://www.tiktok.com/@evanluxcr",
  instagram: "https://www.instagram.com/evanluxcr"
};

const grid = document.querySelector("#reward-grid");
const lastUpdatedEl = document.querySelector("#last-updated");
const autoStateEl = document.querySelector("#reward-auto-state");

initRewards();
bindSocials();

async function initRewards() {
  if (!grid) return;
  grid.innerHTML = `<div class="state-msg">🔎 Recherche automatique des récompenses actives…</div>`;

  try {
    const res = await fetch(`${API_BASE}/rewards-auto`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || data?.error || `Erreur HTTP ${res.status}`);

    const active = Array.isArray(data.active) ? data.active : [];
    if (!active.length) throw new Error("Aucune récompense active détectée automatiquement.");

    renderRewards(active, "auto");
    const checked = formatDateTime(data.checkedAt);
    if (lastUpdatedEl) lastUpdatedEl.textContent = `Vérifié automatiquement ${checked}`;
    if (autoStateEl) {
      autoStateEl.className = "reward-auto-state reward-auto-state--ok";
      autoStateEl.innerHTML = `✅ Mise à jour automatique active • <strong>${active.length}</strong> récompense(s) listée(s) active(s) • vérification ${escapeHtml(checked)}.`;
    }
  } catch (err) {
    renderRewards(FALLBACK_REWARDS.map(x => ({ ...x, status: "unknown", source: "fallback" })), "fallback");
    if (lastUpdatedEl) lastUpdatedEl.textContent = "Source automatique indisponible";
    if (autoStateEl) {
      autoStateEl.className = "reward-auto-state";
      autoStateEl.textContent = ""; 
      autoStateEl.style.display = "none";
    }
  }
}

function renderRewards(rewards, mode) {
  grid.innerHTML = "";
  rewards.forEach((reward, index) => {
    const type = detectType(`${reward.title || ""} ${reward.description || ""}`);
    const status = reward.status || (mode === "auto" ? "active" : "unknown");
    const statusLabel = status === "active" ? "✅ ACTIF" : status === "expired" ? "❌ EXPIRÉ" : "";
    const statusClass = status === "active" ? "active" : status === "expired" ? "expired" : "unknown";
    const link = safeUrl(reward.link || reward.sourceUrl || "#");
    const canOpen = link !== "#";
    const code = reward.code ? String(reward.code) : "";

    const card = document.createElement("article");
    card.className = `reward-card reward-card--${statusClass}`;
    card.innerHTML = `
      <div class="reward-card__topline">
        <div class="reward-tag reward-tag--${type}">${typeLabel(type)}</div>
        <div class="reward-status reward-status--${statusClass}">${statusLabel}</div>
      </div>
      <h3>${escapeHtml(reward.title || "Récompense Clash Royale")}</h3>
      <p>${escapeHtml(reward.description || "Récompense gratuite détectée automatiquement.")}</p>
      ${reward.validFrom ? `<p class="reward-date">Disponible depuis : <strong>${escapeHtml(reward.validFrom)}</strong></p>` : ""}
      ${reward.expires ? `<p class="reward-date">Expire : <strong>${escapeHtml(reward.expires)}</strong></p>` : ""}
      ${code ? `<div class="reward-code"><span>Code</span><strong>${escapeHtml(code)}</strong></div>` : ""}
      ${canOpen ? `<div class="qr-wrap"><canvas id="qr-${index}" aria-label="QR code pour ${escapeHtml(reward.title || "récompense")}"></canvas></div>` : ""}
      <div class="reward-actions">
        ${canOpen ? `<a class="btn btn--primary" href="${link}" target="_blank" rel="noopener noreferrer">🎁 Ouvrir la récompense</a>` : ""}
        ${code ? `<button type="button" class="btn btn--secondary" data-copy="${escapeAttr(code)}">📋 Copier le code</button>` : ""}
        ${canOpen ? `<button type="button" class="btn btn--secondary" data-copy="${escapeAttr(reward.link || reward.sourceUrl || "")}">🔗 Copier le lien</button>` : ""}
      </div>
      ${reward.sourceUrl ? `<a class="reward-source-link" href="${safeUrl(reward.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source / détail</a>` : ""}
    `;
    grid.appendChild(card);

    if (canOpen && window.QRious) {
      new QRious({
        element: document.querySelector(`#qr-${index}`),
        value: reward.link || reward.sourceUrl,
        size: 140,
        level: "H"
      });
    }
  });

  bindCopyButtons();
}

function bindCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      try {
        await navigator.clipboard.writeText(value);
        const original = button.textContent;
        button.textContent = "✅ Copié !";
        button.disabled = true;
        setTimeout(() => {
          button.textContent = original;
          button.disabled = false;
        }, 1500);
      } catch {
        window.prompt("Copie manuellement :", value);
      }
    });
  });
}

function bindSocials() {
  document.querySelectorAll("[data-social]").forEach(link => {
    const key = link.dataset.social;
    if (socials[key] && socials[key] !== "#") {
      link.href = socials[key];
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.addEventListener("click", e => e.preventDefault());
    }
  });
}

function safeUrl(url) {
  try {
    const parsed = new URL(String(url || ""), window.location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {}
  return "#";
}

function detectType(title) {
  const t = String(title).toLowerCase();
  if (/\bor\b|gold/.test(t)) return "or";
  if (t.includes("emote")) return "emote";
  if (t.includes("bannière") || t.includes("banniere") || t.includes("banner")) return "banniere";
  if (t.includes("skin")) return "skin";
  return "autre";
}

function typeLabel(type) {
  const labels = {
    or: "🪙 OR",
    emote: "😀 EMOTE",
    banniere: "🚩 BANNIÈRE",
    skin: "🎨 SKIN",
    autre: "🎁 RÉCOMPENSE"
  };
  return labels[type] || labels.autre;
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "maintenant";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
