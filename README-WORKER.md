# Worker Cloudflare — EVANLUX Clash Royale

Le site GitHub Pages garde la clé Clash Royale hors du navigateur grâce à ce Worker.

## Installation

1. Ouvre **Cloudflare > Workers & Pages > ton Worker > Edit code**.
2. Remplace le contenu du fichier principal par `worker/index.js` (ou `index.js`, identique dans ce projet).
3. Dans **Settings > Variables and Secrets**, crée le secret `CR_API_KEY` avec ta clé Clash Royale.
4. Clique sur **Deploy**.
5. Vérifie dans `config.js` que `API_BASE` correspond bien à l'URL de ton Worker.

## Routes utilisées

- `/player/TAG` : profil joueur.
- `/player/TAG/full` : profil + combats récents + coffres + catalogue de cartes.
- `/player/TAG/battlelog` : combats récents.
- `/player/TAG/upcomingchests` : coffres à venir.
- `/cards` : catalogue de cartes.
- `/leaderboard?country=global&limit=200` : Ranked / Path of Legend uniquement.
- `/meta-decks?arena=ranked&sort=rating&time=7d&limit=20` : decks meta automatiques.

Le Deck Meta essaie d'abord de lire les statistiques publiques de RoyaleAPI. Si cette source ne répond pas, le Worker calcule un secours à partir des combats récents d'un échantillon de joueurs du classement Ranked.
