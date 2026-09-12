# EVANLUX Clash Royale V11

Version entièrement remise à plat : design, navigation, messages, Decks 2v2, tracker, leaderboard et récompenses.

## Installation du site
Dépose tous les fichiers du ZIP sur GitHub Pages en conservant le dossier `assets`.

## Cloudflare
Installe le Worker V11 fourni séparément. Dans Cloudflare > Worker > Settings > Variables and Secrets, ajoute :

- `CR_API_KEY` : ta clé API Clash Royale / proxy royaleapi.dev

Le site pointe déjà vers : `https://cloudflare.leleuxevan.workers.dev`. Si l'URL change, modifie `config.js`.

## Test rapide
Ouvre `https://TON-WORKER.workers.dev/health` : la réponse doit avoir `ok: true` et `hasApiKey: true`.
