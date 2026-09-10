# EVANLUX — Hub Clash Royale

Site statique prêt pour GitHub Pages, avec plusieurs rubriques.

## Structure du site

- `index.html` : page d'accueil avec les 4 rubriques
- `recompenses.html` + `rewards.js` : récompenses + QR codes (ancienne page principale)
- `deck-meta.html` : page "bientôt disponible", à remplir plus tard
- `tracker.html` + `tracker.js` : recherche d'un compte par tag et affichage des stats
- `leaderboard.html` + `leaderboard.js` : classement mondial / par pays
- `config.js` : URL du Worker (proxy API) à renseigner
- `style.css` : design partagé par toutes les pages
- `assets/banniere.jpeg` : bannière
- `worker/index.js` + `worker/README-WORKER.md` : code et instructions du
  serveur relais Cloudflare nécessaire au tracker et au leaderboard
  (ne se déploie PAS sur GitHub Pages, voir le README dédié)

## Modifier les récompenses

Ouvre `rewards.js` et modifie le tableau `rewards`.

Exemple :

```js
{
  title: "Coffre magique",
  description: "Une nouvelle récompense disponible.",
  link: "https://ton-vrai-lien-de-recompense.fr",
  label: "Récupérer"
}
```

Le QR code se met à jour automatiquement avec le lien.

## Modifier Twitch / TikTok / Instagram

Dans `rewards.js`, modifie :

```js
const socials = {
  twitch: "https://www.twitch.tv/TON_COMPTE",
  tiktok: "https://www.tiktok.com/@TON_COMPTE",
  instagram: "https://www.instagram.com/TON_COMPTE"
};
```

## Activer le tracker et le leaderboard

Ces deux pages ont besoin d'un petit serveur relais (Worker Cloudflare) pour
aller chercher les données sur l'API officielle Clash Royale sans exposer ta
clé API. Suis les instructions dans `worker/README-WORKER.md`, puis renseigne
l'URL obtenue dans `config.js`.

## Pourquoi pas de "TV Royale" ?

Ce n'est pas possible : cette fonctionnalité (spectate en direct) n'est pas
exposée par l'API officielle de Supercell, aucun site tiers ne peut y accéder.

## GitHub Pages

1. Crée un dépôt GitHub.
2. Pour un site personnel, tu peux nommer le dépôt `TONPSEUDO.github.io`.
3. Envoie tous les fichiers de ce dossier à la racine du dépôt (y compris le
   dossier `worker/`, il ne sera pas utilisé par GitHub Pages mais sert de
   référence).
4. Dans le dépôt : `Settings` → `Pages`.
5. Dans `Build and deployment`, choisis `Deploy from a branch`.
6. Choisis `main` et `/ (root)`, puis `Save`.
7. Attends quelques minutes et ouvre l'adresse affichée par GitHub Pages.
