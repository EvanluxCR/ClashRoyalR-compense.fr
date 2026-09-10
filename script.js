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
    title: "Bannière x2",
    description: "2 bannières à récupérer",
    link: "https://link.clashroyale.com/en/?action=voucher&code=819f7582-9242-444a-a6bf-9ea3efa913e3",
    label: "Obtenir la récompense"
  },
  
  {
    title: "Emote x1",
    description: "1 Emote à récupérer",
    link: "https://on.royaleapi.com/s84prsnore",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Emote x1",
    description: "1 Emote à récupérer",
    link: "https://link.clashroyale.com/en/?action=voucher&code=6884f0e3-367c-4449-93ef-fb4e17ac55a1",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Or x1000",
    description: "1000 Or a récupérer",
    link: "https://link.clashroyale.com/en/?action=voucher&code=2c13ee10-68de-4cc6-940e-57cfb9aebb0c",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Bannière x1",
    description: "1 bannières à récupérer",
    link: "https://link.clashroyale.com/en/?action=voucher&code=80486871-5620-4237-83fb-42174ddc8a83",
    label: "Obtenir la récompense"
  },
  
  {
    title: "Emote x1",
    description: "1 Emote à récupérer",
    link: "https://link.clashroyale.com/de/?action=voucher&code=bf578c2b-bc44-4312-8c61-5e513b6fb817",
    label: "Obtenir la récompense"
  },
  
  {
    title: "Bannière x2",
    description: "2 bannières à récupérer",
    link: "https://bit.ly/4yChG9p?r=qr",
    label: "Obtenir la récompense"
  },
  
  {
    title: "Bannière x2",
    description: "2 bannières à récupérer",
    link: "https://bit.ly/47j8tH6?r=qr",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Emote x1",
    description: "1 Emote à récupérer",
    link: "https://link.clashroyale.com/?action=voucher&code=4e2bceb9-d231-4d54-a331-5b8d08005c86",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Emote x1",
    description: "1 Emote à récupérer",
    link: "https://bit.ly/4dTNIFx?r=qr",
    label: "Obtenir la récompense"
  },
  
  {
    title: "Skin de tour x1 + Emote x1",
    description: "1 skin de tour avec 1 emote à récupérer",
    link: "https://store.supercell.com/clashroyale?boost=Tryaz ",
    label: "Obtenir la récompense"
  },
 
  {
    title: "Bannière x2",
    description: "2 bannières à récupérer",
    link: "https://supr.cl/4cZS8tA?r=qr",
    label: "Obtenir la récompense"
  },
 
  {
    title: "#",
    description: "#",
    link: "#",
    label: "Obtenir la récompense"
  }
 
];

/* Mets ici tes vrais réseaux quand tu les as. */
const socials = {
  twitch: "https://www.twitch.tv/evanlux",
  tiktok: "https://www.tiktok.com/@evanluxcr",
  instagram: "https://www.instagram.com/evanluxcr"
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
