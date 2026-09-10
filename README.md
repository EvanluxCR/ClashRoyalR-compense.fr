# EVANLUX — Récompenses Clash Royale

Site statique prêt pour GitHub Pages.

## Fichiers

- `index.html` : structure de la page
- `style.css` : design
- `script.js` : récompenses + génération automatique des QR codes
- `assets/banniere.jpeg` : bannière fournie
- `.nojekyll` : évite un traitement Jekyll inutile

## Modifier les récompenses

Ouvre `script.js` et modifie le tableau `rewards`.

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

Dans `script.js`, modifie :

```js
const socials = {
  twitch: "https://www.twitch.tv/TON_COMPTE",
  tiktok: "https://www.tiktok.com/@TON_COMPTE",
  instagram: "https://www.instagram.com/TON_COMPTE"
};
```

## GitHub Pages

1. Crée un dépôt GitHub.
2. Pour un site personnel, tu peux nommer le dépôt `TONPSEUDO.github.io`.
3. Envoie tous les fichiers de ce dossier à la racine du dépôt.
4. Dans le dépôt : `Settings` → `Pages`.
5. Dans `Build and deployment`, choisis `Deploy from a branch`.
6. Choisis `main` et `/ (root)`, puis `Save`.
7. Attends quelques minutes et ouvre l'adresse affichée par GitHub Pages.
