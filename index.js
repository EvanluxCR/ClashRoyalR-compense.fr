/*
  ==========================================================
  WORKER CLOUDFLARE — PROXY API CLASH ROYALE
  ==========================================================
  Ce fichier NE fait PAS partie du site GitHub Pages.
  Il se déploie séparément sur Cloudflare Workers (gratuit).
  Voir README-WORKER.md pour les instructions complètes.

  Rôle : recevoir les requêtes de ton site (tracker + leaderboard),
  les transmettre à l'API officielle Clash Royale (via le proxy
  RoyaleAPI qui a une IP fixe déjà whitelistable), en y ajoutant
  ta clé API secrète, puis renvoyer le résultat au site.
*/

// Remplace par l'URL EXACTE de ton site GitHub Pages (sans slash à la fin)
const ALLOWED_ORIGIN = "https://evanluxcr.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Réponse aux requêtes de pré-vérification CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    let apiPath;

    if (url.pathname.startsWith("/player/")) {
      // /player/ABC123  ->  /v1/players/%23ABC123
      const tag = decodeURIComponent(url.pathname.replace("/player/", "")).replace("#", "");
      if (!tag) {
        return jsonResponse({ error: "Tag manquant" }, 400, corsHeaders);
      }
      apiPath = `/v1/players/%23${encodeURIComponent(tag)}`;
    } else if (url.pathname === "/leaderboard") {
      // /leaderboard?country=global  ->  /v1/locations/global/rankings/players
      const country = url.searchParams.get("country") || "global";
      apiPath = `/v1/locations/${encodeURIComponent(country)}/rankings/players?limit=50`;
      
    } else {
      return jsonResponse({ error: "Route inconnue" }, 404, corsHeaders);
    }

    try {
      const apiRes = await fetch(`https://proxy.royaleapi.dev${apiPath}`, {
        headers: {
          Authorization: `Bearer ${env.CR_API_KEY}`,
          Accept: "application/json",
        },
      });

      const body = await apiRes.text();

      return new Response(body, {
        status: apiRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      return jsonResponse({ error: "Erreur du proxy Worker" }, 500, corsHeaders);
    }
  },
};

function jsonResponse(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
