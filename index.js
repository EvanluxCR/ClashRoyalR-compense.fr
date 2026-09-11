/*
  ==========================================================
  WORKER CLOUDFLARE — EVANLUX / CLASH ROYALE
  ==========================================================
  - Tracker joueur complet
  - Battle log / coffres / cartes
  - Leaderboard Ranked / Path of Legend uniquement
  - Deck Meta automatique via API officielle : arènes, Voie saisonnière, Ranked et Ultimate Champion
*/

const ALLOWED_ORIGINS = [
  "https://evanluxcr.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

const API_ROOT = "https://proxy.royaleapi.dev/v1";
const API_PAGE_SIZE = 100;
const MAX_LEADERBOARD_ITEMS = 500;
const MAX_LEADERBOARD_PAGES = 5;
const FREEBIES_SOURCE_URL = "https://royaleapi.com/free?lang=en";

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Méthode non autorisée" }, 405, corsHeaders);
    }

    try {
      // Les pages publiques Deck Meta et Récompenses peuvent fonctionner sans clé Clash Royale.
      if (url.pathname === "/meta-decks") {
        return handleMetaDecks(url, env, corsHeaders);
      }

      if (url.pathname === "/rewards-auto") {
        return handleAutoRewards(corsHeaders);
      }

      if (!env.CR_API_KEY) {
        return jsonResponse(
          { error: "Secret CR_API_KEY manquant dans Cloudflare Workers" },
          500,
          corsHeaders
        );
      }

      const playerMatch = url.pathname.match(/^\/player\/([^/]+)$/);
      if (playerMatch) {
        const tag = normalizeTag(playerMatch[1]);
        if (!tag) return jsonResponse({ error: "Tag invalide" }, 400, corsHeaders);
        return proxyJson(env, `/players/%23${encodeURIComponent(tag)}`, corsHeaders, 30);
      }

      const fullMatch = url.pathname.match(/^\/player\/([^/]+)\/full$/);
      if (fullMatch) {
        const tag = normalizeTag(fullMatch[1]);
        if (!tag) return jsonResponse({ error: "Tag invalide" }, 400, corsHeaders);

        const encodedTag = `%23${encodeURIComponent(tag)}`;
        const [playerRes, battlesRes, chestsRes, cardsRes] = await Promise.all([
          apiFetch(env, `/players/${encodedTag}`),
          apiFetch(env, `/players/${encodedTag}/battlelog`),
          apiFetch(env, `/players/${encodedTag}/upcomingchests`),
          apiFetch(env, `/cards`),
        ]);

        if (!playerRes.ok) {
          return jsonResponse(
            normalizeUpstreamError(playerRes, "Impossible de récupérer le joueur"),
            playerRes.status,
            corsHeaders
          );
        }

        const warnings = [];
        if (!battlesRes.ok) warnings.push(`battlelog: HTTP ${battlesRes.status}`);
        if (!chestsRes.ok) warnings.push(`upcomingchests: HTTP ${chestsRes.status}`);
        if (!cardsRes.ok) warnings.push(`cards: HTTP ${cardsRes.status}`);

        return jsonResponse(
          {
            player: playerRes.data,
            battles: battlesRes.ok && Array.isArray(battlesRes.data) ? battlesRes.data : [],
            upcomingChests:
              chestsRes.ok && chestsRes.data && Array.isArray(chestsRes.data.items)
                ? chestsRes.data.items
                : [],
            cardsCatalog:
              cardsRes.ok && cardsRes.data && Array.isArray(cardsRes.data.items)
                ? cardsRes.data.items
                : [],
            warnings,
            fetchedAt: new Date().toISOString(),
          },
          200,
          { ...corsHeaders, "Cache-Control": "public, max-age=20" }
        );
      }

      const battleMatch = url.pathname.match(/^\/player\/([^/]+)\/battlelog$/);
      if (battleMatch) {
        const tag = normalizeTag(battleMatch[1]);
        if (!tag) return jsonResponse({ error: "Tag invalide" }, 400, corsHeaders);
        return proxyJson(env, `/players/%23${encodeURIComponent(tag)}/battlelog`, corsHeaders, 15);
      }

      const chestMatch = url.pathname.match(/^\/player\/([^/]+)\/upcomingchests$/);
      if (chestMatch) {
        const tag = normalizeTag(chestMatch[1]);
        if (!tag) return jsonResponse({ error: "Tag invalide" }, 400, corsHeaders);
        return proxyJson(env, `/players/%23${encodeURIComponent(tag)}/upcomingchests`, corsHeaders, 30);
      }

      if (url.pathname === "/cards") {
        return proxyJson(env, "/cards", corsHeaders, 3600);
      }

      if (url.pathname === "/leaderboard") {
        const location = sanitizeLocation(url.searchParams.get("country") || "global");
        const limit = clampInt(url.searchParams.get("limit"), 1, MAX_LEADERBOARD_ITEMS, 200);
        const result = await fetchPagedItems(env, `/locations/${location}/pathoflegend/players`, limit);

        if (!result.ok) {
          return jsonResponse(
            normalizeUpstreamError(result.upstream, "Impossible de récupérer le leaderboard Ranked"),
            result.status,
            corsHeaders
          );
        }

        return jsonResponse(
          {
            items: result.items,
            paging: result.paging,
            mode: "pathoflegend",
            location,
            exhausted: result.exhausted,
          },
          200,
          { ...corsHeaders, "Cache-Control": "public, max-age=30" }
        );
      }

      return jsonResponse(
        {
          error: "Route inconnue",
          routes: [
            "/player/TAG",
            "/player/TAG/full",
            "/player/TAG/battlelog",
            "/player/TAG/upcomingchests",
            "/cards",
            "/leaderboard?country=global&limit=200",
            "/meta-decks?arena=seasonal1&sort=rating&time=7d&limit=20",
            "/meta-decks?arena=uc-2500-3000&sort=rating&time=7d&limit=20",
            "/rewards-auto",
          ],
        },
        404,
        corsHeaders
      );
    } catch (err) {
      return jsonResponse(
        { error: "Erreur du proxy Worker", detail: err?.message || String(err) },
        500,
        corsHeaders
      );
    }
  },
};

async function handleAutoRewards(corsHeaders) {
  let sourceRes;
  try {
    sourceRes = await fetch(FREEBIES_SOURCE_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.7",
        "User-Agent": "Mozilla/5.0 (compatible; EVANLUX-ClashRoyale-Rewards/1.0)",
      },
      cf: { cacheEverything: true, cacheTtl: 1800 },
    });
  } catch (err) {
    return jsonResponse(
      { error: "Source récompenses indisponible", detail: err?.message || String(err) },
      502,
      corsHeaders
    );
  }

  if (!sourceRes.ok) {
    return jsonResponse(
      { error: "Source récompenses indisponible", detail: `RoyaleAPI HTTP ${sourceRes.status}` },
      502,
      corsHeaders
    );
  }

  const html = await sourceRes.text();
  const parsed = parseRoyaleApiFreebies(html);
  if (!parsed.active.length) {
    return jsonResponse(
      { error: "Aucune récompense active détectée", detail: "La structure de la page source a peut-être changé." },
      502,
      corsHeaders
    );
  }

  return jsonResponse(
    {
      active: parsed.active,
      expired: parsed.expired,
      source: "royaleapi-free",
      sourceUrl: FREEBIES_SOURCE_URL,
      checkedAt: new Date().toISOString(),
      note: "Le statut indique qu'une récompense est listée comme active globalement par la source. Il ne peut pas dire si un compte précis l'a déjà réclamée.",
    },
    200,
    { ...corsHeaders, "Cache-Control": "public, max-age=1800" }
  );
}

function parseRoyaleApiFreebies(html) {
  const source = String(html || "");
  const activeSection = sliceHtmlSection(source, ["Free and Special Rewards", "Current Free Stuff", "Current Freebies"], ["How to claim Clash Royale store codes", "Expired Freebies", "Expired Items", "Expired Giveaways"]);
  const expiredSection = sliceHtmlSection(source, ["Expired Freebies", "Expired Items"], ["Expired Giveaways", "How to claim", "Store code alerts"]);

  return {
    active: extractFreebieEntries(activeSection, "active"),
    expired: extractFreebieEntries(expiredSection, "expired"),
  };
}

function sliceHtmlSection(html, starts, ends) {
  const lower = html.toLowerCase();
  let start = -1;
  for (const marker of starts) {
    const i = lower.indexOf(String(marker).toLowerCase());
    if (i !== -1 && (start === -1 || i < start)) start = i;
  }
  if (start === -1) return "";

  let end = html.length;
  for (const marker of ends) {
    const i = lower.indexOf(String(marker).toLowerCase(), start + 10);
    if (i !== -1 && i < end) end = i;
  }
  return html.slice(start, end);
}

function extractFreebieEntries(section, status) {
  if (!section) return [];

  const anchors = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRe.exec(section)) !== null) {
    const href = absoluteFreebieUrl(m[1]);
    const text = htmlToText(m[2]);
    // RoyaleAPI utilise « Claim » pour les récompenses gratuites actives.
    // Cela évite d'importer les offres payantes présentes sur la même page.
    if (!/^claim$/i.test(text.trim()) && !(/link\.clashroyale\.com/i.test(href) && /claim/i.test(text))) continue;
    anchors.push({ index: m.index, end: anchorRe.lastIndex, href, text });
  }

  const rows = [];
  const seen = new Set();
  for (let i = 0; i < anchors.length; i++) {
    const item = anchors[i];
    const previousEnd = i > 0 ? anchors[i - 1].end : 0;
    const nextIndex = i + 1 < anchors.length ? anchors[i + 1].index : section.length;
    const blockStart = Math.max(previousEnd, item.index - 2600);
    const blockEnd = Math.min(nextIndex, item.end + 2600);
    const block = section.slice(blockStart, blockEnd);
    const before = section.slice(blockStart, item.index);
    const context = htmlToText(block);
    const beforeText = htmlToText(before);

    const title = extractNearbyFreebieTitle(before, item.text, beforeText);
    const code = extractStoreOrVoucherCode(item.href, context);
    const validFrom = extractLastDateLabel(beforeText, ["Released on", "Valid from", "Discovered"]);
    const expires = extractDateLabel(context, ["Expires", "Valid until", "Ends"]);
    const priceMatch = context.match(/Price\s*\|?\s*([^|]{1,40}?)(?=\s+(?:Source|Category|Tags|What’s Inside)|$)/i);
    const price = priceMatch ? priceMatch[1].trim() : "Free!";

    if (status === "active" && price && !/free/i.test(price)) continue;

    const entry = {
      title: title || (code ? `Code gratuit ${code}` : "Récompense Clash Royale"),
      description: compactFreebieDescription(context, title),
      link: item.href,
      sourceUrl: FREEBIES_SOURCE_URL,
      code: code || null,
      validFrom: validFrom || null,
      expires: expires || null,
      status,
    };

    const key = code ? `code:${code}` : `url:${item.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(entry);
  }

  return rows.slice(0, 40);
}

function buildFreebieEntry({ href, anchorText, around, context, status }) {
  const title = extractNearbyFreebieTitle(around, anchorText, context);
  const code = extractStoreOrVoucherCode(href, context);
  const validFrom = extractDateLabel(context, ["Valid from", "Released on", "Discovered"]);
  const expires = extractDateLabel(context, ["Expires", "Valid until", "Ends"]);
  const direct = isDirectClaimUrl(href);

  let link = direct ? href : href;
  if (code && !direct && /store code/i.test(context)) {
    link = "https://store.supercell.com/clashroyale";
  }

  if (!title && !code) return null;
  return {
    title: title || (code ? `Code gratuit ${code}` : "Récompense Clash Royale"),
    description: compactFreebieDescription(context, title),
    link,
    sourceUrl: href,
    code: code || null,
    validFrom: validFrom || null,
    expires: expires || null,
    status,
  };
}

function extractNearbyFreebieTitle(html, anchorText, context) {
  const text = String(context || "").replace(/\s+/g, " ").trim();
  const typeTitleRe = /(?:Emote|Resource|Banner|Tower Skin|Chest|Bundle|Badge|Decoration)\s+(.{3,120}?)\s+Released on/gi;
  let m;
  let candidate = "";
  while ((m = typeTitleRe.exec(text)) !== null) candidate = m[1].trim();

  if (!candidate) {
    const headings = [...String(html || "").matchAll(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/gi)]
      .map(x => htmlToText(x[1]))
      .filter(Boolean);
    candidate = headings.length ? headings[headings.length - 1] : String(anchorText || "").trim();
  }

  candidate = candidate.replace(/^(New|Expired)\s+/i, "").trim();
  if (/^(claim|detail|learn more|go)$/i.test(candidate)) candidate = "";
  return candidate.slice(0, 120);
}

function extractLastDateLabel(context, labels) {
  let found = "";
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:?\\s*((?:20\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2})|(?:[A-Z][a-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+20\\d{2})?))`, "gi");
    let m;
    while ((m = re.exec(String(context || ""))) !== null) found = m[1];
    if (found) return found;
  }
  return found;
}

function compactFreebieDescription(context, title) {
  let text = String(context || "").replace(/\s+/g, " ").trim();
  if (title) text = text.replace(title, " ");
  text = text
    .replace(/Current Free Stuff/gi, " ")
    .replace(/Expired (?:Freebies|Items)/gi, " ")
    .replace(/Free Claim/gi, " ")
    .replace(/Detail/gi, " ")
    .replace(/Valid from:\s*[^ ]+(?:\s+[^ ]+)?/gi, " ")
    .replace(/Released on\s*[^ ]+(?:\s+[^ ]+)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Récompense gratuite Clash Royale.";
  return text.slice(0, 220);
}

function extractStoreOrVoucherCode(href, context) {
  try {
    const u = new URL(href);
    const voucher = u.searchParams.get("code");
    if (voucher) return voucher;
  } catch {}

  const text = String(context || "");
  const patterns = [
    /Store Code\s*[-:–]?\s*([A-Z0-9!_-]{4,40})/i,
    /Code\s*[-:–]?\s*([A-Z][A-Z0-9!_-]{3,39})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && !/^(FREE|CLAIM|STORE)$/i.test(m[1])) return m[1];
  }
  return "";
}

function extractDateLabel(context, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}\s*:?\s*((?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})|(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+20\d{2})?))`, "i");
    const m = String(context || "").match(re);
    if (m) return m[1];
  }
  return "";
}

function isLikelyFreebieLink(href, anchorText, context) {
  const text = `${anchorText || ""} ${context || ""}`;
  if (isDirectClaimUrl(href)) return true;
  if (/royaleapi\.com\/free/i.test(href) && /(free|claim|emote|banner|gold|resource|reward|code)/i.test(text)) return true;
  return false;
}

function isDirectClaimUrl(href) {
  return /(?:link\.clashroyale\.com|store\.supercell\.com|supr\.cl|on\.royaleapi\.com|bit\.ly)/i.test(String(href || ""));
}

function absoluteFreebieUrl(href) {
  try { return new URL(decodeHtmlEntities(href), "https://royaleapi.com").toString(); }
  catch { return "https://royaleapi.com/free"; }
}

async function handleMetaDecks(url, env, corsHeaders) {
  const scopeParam = String(url.searchParams.get("arena") || "ranked").toLowerCase();
  const sort = sanitizeChoice(url.searchParams.get("sort"), ["rating", "win", "pop"], "rating");
  const time = sanitizeChoice(url.searchParams.get("time"), ["1d", "3d", "7d"], "7d");
  const limit = clampInt(url.searchParams.get("limit"), 5, 30, 20);
  const seedTag = normalizeTag(url.searchParams.get("seedTag") || "");

  if (!env.CR_API_KEY) {
    return jsonResponse(
      { error: "Secret CR_API_KEY manquant dans Cloudflare Workers" },
      500,
      corsHeaders
    );
  }

  const arena = /^\d+$/.test(scopeParam)
    ? ARENAS.find(a => a.id === Number(scopeParam)) || null
    : null;
  const spec = getMetaScopeSpec(scopeParam, arena);

  // Depuis juillet 2026, RoyaleAPI bloque explicitement le scraping automatisé
  // avec un challenge Cloudflare (HTTP 403). On ne scrape donc plus RoyaleAPI ici.
  // Les statistiques ci-dessous sont calculées directement à partir des battle logs
  // fournis par l'API officielle Clash Royale.
  let result = await buildMetaFromOfficialBattles(env, {
    spec,
    arena,
    sort,
    limit,
    time,
    seedTag,
  });

  let estimated = false;
  let estimateReason = "";

  // Pour les petites arènes, l'API officielle ne fournit pas un annuaire mondial des
  // joueurs par tranche de trophées. Si aucun combat exact n'est trouvé, on renvoie
  // tout de même une meta récente calculée sur l'échantillon officiel disponible,
  // clairement marquée comme estimation au lieu d'afficher une erreur HTTP 403.
  if (!result.decks.length && spec.mode !== "ranked" && spec.mode !== "ultimate-champion") {
    const fallbackSpec = getMetaScopeSpec("ranked", null);
    result = await buildMetaFromOfficialBattles(env, {
      spec: fallbackSpec,
      arena: null,
      sort,
      limit,
      time,
      seedTag,
    });
    estimated = true;
    estimateReason = seedTag
      ? "Pas assez de combats récents trouvés dans cette tranche de trophées ; estimation basée sur l'échantillon officiel récent disponible."
      : "L'API officielle ne permet pas de lister tous les joueurs par arène ; estimation basée sur un échantillon récent. Entre ton tag pour améliorer la précision autour de ton niveau.";
  }

  if (!result.decks.length) {
    return jsonResponse(
      {
        error: "Pas assez de combats récents pour calculer cette meta",
        detail: "Réessaie dans quelques minutes ou entre ton tag joueur puis clique sur Adapter.",
      },
      404,
      corsHeaders
    );
  }

  return jsonResponse(
    {
      decks: result.decks,
      source: "official-api-sample",
      mode: spec.mode,
      scope: scopeParam,
      scopeLabel: spec.label,
      arena,
      trophyRange: spec.trophyRange,
      rankedRange: spec.rankedRange,
      sort,
      time,
      sampledPlayers: result.sampledPlayers,
      sampledBattles: result.sampledBattles,
      matchingBattles: result.matchingBattles,
      estimated,
      estimateReason,
      fetchedAt: new Date().toISOString(),
    },
    200,
    { ...corsHeaders, "Cache-Control": "public, max-age=300" }
  );
}

function getMetaScopeSpec(scope, arena) {
  if (arena) {
    return {
      mode: "arena",
      label: `🏟️ Arène ${arena.id} — ${arena.name}`,
      royaleType: "Ladder",
      trophyRange: { min: arena.min, max: arena.max },
      rankedRange: null,
      allowRankedFallback: false,
    };
  }

  const specs = {
    ranked: {
      mode: "ranked",
      label: "⚔️ Classé — toutes les ligues",
      royaleType: "Ranked",
      trophyRange: null,
      rankedRange: null,
      allowRankedFallback: true,
    },
    "uc-all": {
      mode: "ultimate-champion",
      label: "👑 Champion suprême — tous les ratings",
      royaleType: "TopRanked",
      trophyRange: null,
      rankedRange: null,
      allowRankedFallback: true,
    },
    "uc-0-2000": {
      mode: "ultimate-champion",
      label: "👑 Champion suprême — rating 0 à 1 999",
      royaleType: "TopRanked",
      trophyRange: null,
      rankedRange: { min: 0, max: 2000 },
      allowRankedFallback: true,
    },
    "uc-2000-2500": {
      mode: "ultimate-champion",
      label: "👑 Champion suprême — rating 2 000 à 2 499",
      royaleType: "TopRanked",
      trophyRange: null,
      rankedRange: { min: 2000, max: 2500 },
      allowRankedFallback: true,
    },
    "uc-2500-3000": {
      mode: "ultimate-champion",
      label: "👑 Champion suprême — rating 2 500 à 2 999",
      royaleType: "TopRanked",
      trophyRange: null,
      rankedRange: { min: 2500, max: 3000 },
      allowRankedFallback: true,
    },
    "uc-3000-plus": {
      mode: "ultimate-champion",
      label: "👑 Champion suprême — rating 3 000+",
      royaleType: "TopRanked",
      trophyRange: null,
      rankedRange: { min: 3000, max: null },
      allowRankedFallback: true,
    },
    seasonal1: {
      mode: "seasonal-trophy-road",
      label: "🌿 Voie saisonnière — Arène I",
      royaleType: "Ladder",
      trophyRange: { min: 14000, max: 14500 },
      rankedRange: null,
      allowRankedFallback: false,
    },
    seasonal2: {
      mode: "seasonal-trophy-road",
      label: "🔥 Voie saisonnière — Arène II",
      royaleType: "Ladder",
      trophyRange: { min: 14500, max: 15000 },
      rankedRange: null,
      allowRankedFallback: false,
    },
    "seasonal-top": {
      mode: "seasonal-trophy-road",
      label: "🏅 Voie saisonnière — 15 000+",
      royaleType: "Ladder",
      trophyRange: { min: 15000, max: null },
      rankedRange: null,
      allowRankedFallback: false,
    },
    all: {
      mode: "trophy-road",
      label: "🏆 Toute la Voie des trophées",
      royaleType: "Ladder",
      trophyRange: { min: 0, max: 14000 },
      rankedRange: null,
      allowRankedFallback: false,
    },
  };

  return specs[scope] || specs.ranked;
}

function parseRoyaleApiDecks(html, limit) {
  if (!html || typeof html !== "string") return [];

  const anchorRegex = /<a\b[^>]*href=["']([^"']*\/decks\/stats\/([^"'?#]+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const occurrences = [];
  const seen = new Set();
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    let encodedCards = match[2] || "";
    try { encodedCards = decodeURIComponent(encodedCards); } catch {}
    const cards = encodedCards.split(",").map(s => s.trim()).filter(Boolean);
    if (cards.length !== 8) continue;
    const key = cards.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    occurrences.push({
      index: match.index,
      href: absoluteRoyaleUrl(match[1]),
      cards,
    });
    if (occurrences.length >= limit + 4) break;
  }

  const decks = [];
  for (let i = 0; i < occurrences.length && decks.length < limit; i++) {
    const item = occurrences[i];
    const nextIndex = occurrences[i + 1]?.index ?? Math.min(html.length, item.index + 12000);
    const start = Math.max(0, item.index - 2200);
    const end = Math.min(html.length, Math.max(nextIndex, item.index + 5000));
    const text = htmlToText(html.slice(start, end));
    const stats = extractMetaStats(text);

    decks.push({
      rank: decks.length + 1,
      name: extractDeckHeading(html.slice(start, item.index), item.cards),
      cards: item.cards,
      royaleApiUrl: item.href,
      rating: stats.rating,
      usage: stats.usage,
      winRate: stats.winRate,
      drawRate: stats.drawRate,
      lossRate: stats.lossRate,
    });
  }

  return decks;
}

function extractDeckHeading(htmlBefore, cards) {
  const headingRegex = /<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi;
  let m;
  let candidate = "";
  while ((m = headingRegex.exec(htmlBefore)) !== null) {
    const text = htmlToText(m[1]);
    if (text && text.length <= 90) candidate = text;
  }

  const bad = /^(royaleapi|decks?|meilleurs decks|best clash royale decks|filtre|filter|affiner|refine)$/i;
  if (candidate && !bad.test(candidate)) return candidate;
  return humanDeckName(cards);
}

function extractMetaStats(text) {
  const normalized = String(text || "")
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const labels = "(?:Rating|Notation)\\s+(?:Usage|Utilisation)\\s+(?:Wins|Victoires)\\s+(?:Draws|Égalités|Nuls)\\s+(?:Losses|Défaites)";
  const re = new RegExp(`${labels}\\s+([0-9]+(?:[.,][0-9]+)?)\\s+([0-9][0-9 .,]*?)\\s+([0-9]+(?:[.,][0-9]+)?)%\\s+([0-9]+(?:[.,][0-9]+)?)%\\s+([0-9]+(?:[.,][0-9]+)?)%`, "i");
  const m = normalized.match(re);
  if (!m) return { rating: null, usage: null, winRate: null, drawRate: null, lossRate: null };

  return {
    rating: parseLocaleNumber(m[1]),
    usage: parseInteger(m[2]),
    winRate: parseLocaleNumber(m[3]),
    drawRate: parseLocaleNumber(m[4]),
    lossRate: parseLocaleNumber(m[5]),
  };
}

async function buildMetaFromOfficialBattles(env, { spec, arena, sort, limit, time, seedTag = "" }) {
  const maxPlayers = 28;
  const seedTags = [];
  const addSeed = (tag) => {
    const normalized = normalizeTag(tag || "");
    if (normalized && !seedTags.includes(normalized)) seedTags.push(normalized);
  };

  addSeed(seedTag);

  const ranking = await apiFetch(env, "/locations/global/pathoflegend/players?limit=14");
  if (ranking.ok && Array.isArray(ranking.data?.items)) {
    for (const player of ranking.data.items) addSeed(player?.tag);
  }

  if (!seedTags.length) {
    return { decks: [], sampledPlayers: 0, sampledBattles: 0, matchingBattles: 0 };
  }

  const allTags = [...seedTags].slice(0, 14);
  const responses = [];
  const firstResponses = await Promise.all(
    allTags.map(tag => apiFetch(env, `/players/%23${encodeURIComponent(tag)}/battlelog`))
  );
  responses.push(...firstResponses);

  // Une petite expansion BFS via les adversaires donne un échantillon bien plus varié,
  // sans dépendre d'un site tiers. C'est particulièrement utile quand un tag joueur est fourni.
  const discovered = new Set(allTags);
  const neighbors = [];
  for (const response of firstResponses) {
    if (!response.ok || !Array.isArray(response.data)) continue;
    for (const battle of response.data) {
      for (const side of [battle?.team, battle?.opponent]) {
        if (!Array.isArray(side)) continue;
        for (const participant of side) {
          const tag = normalizeTag(participant?.tag || "");
          if (!tag || discovered.has(tag)) continue;
          discovered.add(tag);
          neighbors.push(tag);
          if (allTags.length + neighbors.length >= maxPlayers) break;
        }
        if (allTags.length + neighbors.length >= maxPlayers) break;
      }
      if (allTags.length + neighbors.length >= maxPlayers) break;
    }
    if (allTags.length + neighbors.length >= maxPlayers) break;
  }

  const secondTags = neighbors.slice(0, Math.max(0, maxPlayers - allTags.length));
  if (secondTags.length) {
    const secondResponses = await Promise.all(
      secondTags.map(tag => apiFetch(env, `/players/%23${encodeURIComponent(tag)}/battlelog`))
    );
    responses.push(...secondResponses);
    allTags.push(...secondTags);
  }

  const seenBattles = new Set();
  const map = new Map();
  let sampledBattles = 0;
  let matchingBattles = 0;

  const trophyFilter = spec?.trophyRange
    ? { min: spec.trophyRange.min ?? 0, max: spec.trophyRange.max ?? Number.POSITIVE_INFINITY }
    : arena
      ? { min: arena.min, max: arena.max }
      : null;

  for (const response of responses) {
    if (!response.ok || !Array.isArray(response.data)) continue;
    for (const battle of response.data) {
      if (!isBattleWithinWindow(battle, time)) continue;
      const battleKey = makeBattleKey(battle);
      if (seenBattles.has(battleKey)) continue;
      seenBattles.add(battleKey);
      sampledBattles++;

      if (!battleMatchesMetaScope(battle, spec)) continue;
      matchingBattles++;

      const teamCrowns = sumCrowns(battle.team);
      const opponentCrowns = sumCrowns(battle.opponent);
      collectBattleSide(map, battle.team, teamCrowns, opponentCrowns, trophyFilter, spec?.rankedRange || null);
      collectBattleSide(map, battle.opponent, opponentCrowns, teamCrowns, trophyFilter, spec?.rankedRange || null);
    }
  }

  let rows = [...map.values()].filter(x => x.usage >= 1);
  for (const row of rows) {
    row.winRate = row.usage ? (row.wins / row.usage) * 100 : 0;
    row.drawRate = row.usage ? (row.draws / row.usage) * 100 : 0;
    row.lossRate = row.usage ? (row.losses / row.usage) * 100 : 0;
    row.rating = Math.round(row.winRate * 0.78 + Math.min(22, Math.log2(row.usage + 1) * 5));
  }

  rows.sort((a, b) => {
    if (sort === "win") return b.winRate - a.winRate || b.usage - a.usage;
    if (sort === "pop") return b.usage - a.usage || b.winRate - a.winRate;
    return b.rating - a.rating || b.usage - a.usage;
  });

  const decks = rows.slice(0, limit).map((row, i) => ({
    rank: i + 1,
    name: humanDeckName(row.cards),
    cards: row.cards,
    rating: row.rating,
    usage: row.usage,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    winRate: round1(row.winRate),
    drawRate: round1(row.drawRate),
    lossRate: round1(row.lossRate),
  }));

  return {
    decks,
    sampledPlayers: responses.filter(r => r.ok && Array.isArray(r.data)).length,
    sampledBattles,
    matchingBattles,
  };
}

function battleMatchesMetaScope(battle, spec) {
  const type = String(battle?.type || "").toLowerCase();
  const mode = String(battle?.gameMode?.name || battle?.gameMode?.id || "").toLowerCase();
  const ranked = type.includes("pathoflegend") || type.includes("ranked") || mode.includes("path of legend") || mode.includes("ranked") || Number(battle?.leagueNumber) > 0;

  if (spec?.mode === "ranked" || spec?.mode === "ultimate-champion") return ranked;
  if (ranked) return false;

  // Les battle logs de Trophy Road sont généralement de type PvP/Ladder.
  // On écarte explicitement les défis, guerres, tournois et amicaux.
  const excluded = /(challenge|clan|war|tournament|friendly|boat|duel|draft|party|training)/i;
  if (excluded.test(type) || excluded.test(mode)) return false;
  return type === "pvp" || type.includes("ladder") || type.includes("trophy") || mode.includes("ladder") || mode.includes("trophy") || mode.includes("normal battle");
}

function isBattleWithinWindow(battle, time) {
  const days = time === "1d" ? 1 : time === "3d" ? 3 : 7;
  const raw = String(battle?.battleTime || "");
  if (!raw) return true;
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/);
  if (!m) return true;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return true;
  return ts >= Date.now() - days * 86400000;
}

function collectBattleSide(map, participants, ownCrowns, enemyCrowns, arena, rankedRange = null) {
  if (!Array.isArray(participants)) return;
  for (const participant of participants) {
    const cardsRaw = Array.isArray(participant?.cards) ? participant.cards : [];
    if (cardsRaw.length !== 8) continue;

    if (arena) {
      const trophies = Number(participant?.startingTrophies);
      if (!Number.isFinite(trophies) || trophies < arena.min || trophies >= arena.max) continue;
    }

    if (rankedRange) {
      const ranked = Number(participant?.startingTrophies);
      if (!Number.isFinite(ranked) || ranked < rankedRange.min) continue;
      if (Number.isFinite(rankedRange.max) && ranked >= rankedRange.max) continue;
    }

    const cards = cardsRaw.map(cardToMetaSlug).filter(Boolean);
    if (cards.length !== 8) continue;
    const key = [...cards].sort().join(",");
    if (!map.has(key)) {
      map.set(key, { cards, usage: 0, wins: 0, draws: 0, losses: 0 });
    }
    const row = map.get(key);
    row.usage++;
    if (ownCrowns > enemyCrowns) row.wins++;
    else if (ownCrowns < enemyCrowns) row.losses++;
    else row.draws++;
  }
}

function cardToMetaSlug(card) {
  const base = slugify(card?.name || "");
  if (!base) return "";
  if (Number(card?.evolutionLevel) > 0) return `${base}-ev1`;
  if (card?.iconUrls?.heroMedium || card?.hero) return `${base}-hero`;
  return base;
}

function makeBattleKey(battle) {
  const tags = [
    ...(Array.isArray(battle?.team) ? battle.team : []),
    ...(Array.isArray(battle?.opponent) ? battle.opponent : []),
  ].map(x => x?.tag || x?.name || "").sort().join("|");
  return `${battle?.battleTime || ""}|${tags}|${battle?.gameMode?.id || battle?.gameMode?.name || ""}`;
}

function sumCrowns(side) {
  if (!Array.isArray(side)) return 0;
  return side.reduce((sum, p) => sum + (Number(p?.crowns) || 0), 0);
}

function humanDeckName(cards) {
  const names = cards.slice(0, 3).map(s => prettySlug(baseCardSlug(s)));
  return names.join(" • ");
}

function baseCardSlug(slug) {
  return String(slug || "")
    .replace(/-ev\d+$/i, "")
    .replace(/-hero$/i, "")
    .replace(/-evolution$/i, "");
}

function prettySlug(slug) {
  return String(slug || "Carte")
    .split("-")
    .filter(Boolean)
    .map(x => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
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

function absoluteRoyaleUrl(href) {
  try { return new URL(href, "https://royaleapi.com").toString(); }
  catch { return "https://royaleapi.com/decks/popular"; }
}

function htmlToText(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function parseInteger(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function parseLocaleNumber(value) {
  const n = Number(String(value || "").replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

async function fetchPagedItems(env, basePath, requestedLimit) {
  const items = [];
  let after = "";
  let paging = null;
  let exhausted = false;
  let upstream = null;

  for (let page = 0; page < MAX_LEADERBOARD_PAGES && items.length < requestedLimit; page++) {
    const pageSize = Math.min(API_PAGE_SIZE, requestedLimit - items.length);
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (after) query.set("after", after);

    upstream = await apiFetch(env, `${basePath}?${query.toString()}`);
    if (!upstream.ok) {
      return { ok: false, status: upstream.status, upstream, items, paging, exhausted };
    }

    const pageItems = Array.isArray(upstream.data?.items) ? upstream.data.items : [];
    paging = upstream.data?.paging || null;
    items.push(...pageItems);

    const next = upstream.data?.paging?.cursors?.after;
    if (!next || pageItems.length === 0) {
      exhausted = true;
      break;
    }

    const nextCursor = String(next);
    if (nextCursor === after) {
      exhausted = true;
      break;
    }
    after = nextCursor;
  }

  return {
    ok: true,
    status: 200,
    upstream,
    items: items.slice(0, requestedLimit),
    paging,
    exhausted,
  };
}

function buildCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function normalizeTag(raw) {
  const tag = decodeURIComponent(String(raw || ""))
    .replace(/#/g, "")
    .trim()
    .toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : "";
}

function sanitizeLocation(value) {
  const clean = String(value || "global").trim();
  return clean === "global" || /^\d{5,12}$/.test(clean) ? clean : "global";
}

function sanitizeChoice(value, allowed, fallback) {
  const clean = String(value || "").toLowerCase();
  return allowed.includes(clean) ? clean : fallback;
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function apiFetch(env, path) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      Authorization: `Bearer ${env.CR_API_KEY}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: response.ok, status: response.status, data };
}

async function proxyJson(env, path, corsHeaders, cacheSeconds = 0) {
  const upstream = await apiFetch(env, path);
  const headers = { ...corsHeaders };
  if (cacheSeconds > 0) headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  return jsonResponse(upstream.data, upstream.status, headers);
}

function normalizeUpstreamError(upstream, fallback) {
  const detail = upstream?.data?.message || upstream?.data?.reason || upstream?.data?.raw;
  return {
    error: fallback,
    status: upstream?.status || 500,
    ...(detail ? { detail } : {}),
  };
}

function jsonResponse(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
