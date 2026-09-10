/*
  ============================
  MODIFIE TES RÉCOMPENSES ICI
  ============================
  Pour chaque carte :
  - title = nom de la récompense
  - description = petit texte
  - link = lien qui ouvre la récompense
  - label = texte du bouton

  Exemple :
  link: "https://ton-vrai-lien.com"
*/

const rewards = [
  {
    title: "Récompense #1",
    description: "Remplace ce texte par le nom et la description de ta récompense.",
    link: "https://example.com/recompense-1",
    label: "Ouvrir la récompense"
  },
  {
    title: "Récompense #2",
    description: "Ajoute ici une autre récompense Clash Royale.",
    link: "https://example.com/recompense-2",
    label: "Ouvrir la récompense"
  },
  {
    title: "Récompense #3",
    description: "Le QR code est généré automatiquement à partir du lien.",
    link: "https://example.com/recompense-3",
    label: "Ouvrir la récompense"
  },
  {
    title: "Récompense #4",
    description: "Tu peux avoir autant de cartes que tu veux.",
    link: "https://example.com/recompense-4",
    label: "Ouvrir la récompense"
  },
  {
    title: "Récompense #5",
    description: "Pense à remplacer le lien avant de publier la récompense.",
    link: "https://example.com/recompense-5",
    label: "Ouvrir la récompense"
  },
  {
    title: "Récompense #6",
    description: "Reviens régulièrement pour ajouter les nouvelles récompenses.",
    link: "https://example.com/recompense-6",
    label: "Ouvrir la récompense"
  }
];

/* Mets ici tes vrais réseaux quand tu les as. */
const socials = {
  twitch: "#",
  tiktok: "#",
  instagram: "#"
};

const grid = document.querySelector("#reward-grid");

rewards.forEach((reward, index) => {
  const card = document.createElement("article");
  card.className = "reward-card";
  card.innerHTML = `
    <div class="reward-tag">CLASH ROYALE • ${String(index + 1).padStart(2, "0")}</div>
    <h3>${escapeHtml(reward.title)}</h3>
    <p>${escapeHtml(reward.description)}</p>
    <div class="qr-wrap">
      <canvas id="qr-${index}" aria-label="QR code pour ${escapeHtml(reward.title)}"></canvas>
    </div>
    <div class="reward-actions">
      <a class="btn btn--primary" href="${safeUrl(reward.link)}" target="_blank" rel="noopener">
        🎁 ${escapeHtml(reward.label)}
      </a>
      <a class="btn btn--secondary" href="${safeUrl(reward.link)}" target="_blank" rel="noopener">
        🔗 Ouvrir le lien
      </a>
    </div>
  `;
  grid.appendChild(card);

  new QRious({
    element: document.querySelector(`#qr-${index}`),
    value: reward.link,
    size: 140,
    level: "H"
  });
});

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

function safeUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {}
  return "#";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
