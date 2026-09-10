# Worker Cloudflare — version tracker complet + Ranked

Ce Worker garde `CR_API_KEY` côté Cloudflare et expose uniquement des routes sûres au site GitHub Pages.

## Secret obligatoire
Dans Cloudflare > Worker > Settings > Variables and Secrets :
- nom : `CR_API_KEY`
- valeur : ta clé officielle Clash Royale
- type : Secret / Encrypt

La clé ne doit jamais être mise dans GitHub.

## Routes du Worker
- `/player/TAG` : profil simple (ancienne compatibilité)
- `/player/TAG/full` : profil + battle log + coffres + catalogue de cartes
- `/player/TAG/battlelog` : 25 combats récents renvoyés par l'API
- `/player/TAG/upcomingchests` : coffres à venir
- `/cards` : catalogue des cartes
- `/leaderboard?country=global&mode=pathoflegend&limit=50` : Ranked / Path of Legend actuel
- `/leaderboard?country=global&mode=trophies&limit=50` : ancien classement Trophy Road

## Correction importante du leaderboard
Ne pas utiliser `/locations/global/rankings/players` pour afficher Ranked / Path of Legend.
Le Worker utilise désormais :

```text
/v1/locations/<location>/pathoflegend/players
```

La réponse Ranked utilise notamment `rank`, `eloRating` et `leagueNumber`.

## Déploiement
1. Copie `worker/index.js` dans le Worker Cloudflare.
2. Vérifie que `ALLOWED_ORIGINS` contient bien `https://evanluxcr.github.io`.
3. Ajoute le secret `CR_API_KEY`.
4. Deploy.
5. Dans `config.js`, garde l'URL de ton Worker.

## Tests rapides
```text
https://TON-WORKER.workers.dev/player/2PP/full
https://TON-WORKER.workers.dev/leaderboard?country=global&mode=pathoflegend
```

Un profil complet peut faire plusieurs appels API en parallèle. Évite de relancer la recherche en boucle pour ne pas gaspiller le quota API.


## Mise à jour leaderboard

- Ranked / Path of Legend : `/leaderboard?country=global&mode=pathoflegend&limit=200`
- Trophy Road : `/leaderboard?country=global&mode=trophies&limit=200`
- Le Worker peut agréger automatiquement plusieurs pages, jusqu’à 500 joueurs.
- Trophy Road utilise `/leaderboards` puis `/leaderboard/{id}` afin de retrouver dynamiquement le leaderboard actuel au lieu de coder un ID en dur.
