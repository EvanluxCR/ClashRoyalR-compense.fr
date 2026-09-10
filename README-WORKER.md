# Déployer le proxy (Worker) — étape par étape

Le tracker et le leaderboard ont besoin d'un petit serveur qui cache ta clé API
et transmet les requêtes à Clash Royale. GitHub Pages ne peut pas faire ça seul
(c'est un hébergement de fichiers statiques, sans serveur). On utilise donc un
**Cloudflare Worker**, gratuit et simple à mettre en place.

## 1. Créer une clé API Clash Royale

1. Va sur https://developer.clashroyale.com et connecte-toi (ou crée un compte).
2. Clique sur **My Account > New Key**.
3. Donne un nom (ex: "site-evanlux").
4. Dans **Allowed IP addresses**, ajoute cette IP fixe :
   ```
   45.79.218.79
   ```
   (c'est l'IP du proxy RoyaleAPI, qui nous permet de contourner le fait que
   Cloudflare n'a pas d'IP fixe).
5. Sauvegarde et **copie la clé générée** (une longue chaîne de caractères).

## 2. Créer le Worker Cloudflare

1. Va sur https://dash.cloudflare.com et crée un compte gratuit si besoin.
2. Dans le menu, va dans **Workers & Pages > Create > Create Worker**.
3. Donne-lui un nom (ex: `cr-api-proxy`) et clique sur **Deploy**.
4. Une fois créé, clique sur **Edit code**.
5. Supprime tout le code par défaut et colle le contenu du fichier
   `worker/index.js` fourni avec ce site.
6. Modifie la ligne suivante avec l'URL exacte de ton site GitHub Pages :
   ```js
   const ALLOWED_ORIGIN = "https://TON-PSEUDO-GITHUB.github.io";
   ```
7. Clique sur **Deploy** pour sauvegarder.

## 3. Ajouter ta clé API comme secret

1. Toujours sur la page de ton Worker, va dans **Settings > Variables and Secrets**.
2. Clique sur **Add variable**.
3. Nom de la variable : `CR_API_KEY`
4. Valeur : colle la clé API copiée à l'étape 1.
5. Coche bien l'option **Encrypt** (ou "Secret") pour que la clé reste cachée.
6. Sauvegarde.

## 4. Récupérer l'URL du Worker

En haut de la page de ton Worker, tu verras une URL du type :
```
https://cr-api-proxy.tonpseudo.workers.dev
```
Copie-la.

## 5. Connecter le site au Worker

Ouvre le fichier `config.js` à la racine du site et remplace la valeur par
l'URL copiée à l'étape précédente :

```js
const API_BASE = "https://cr-api-proxy.tonpseudo.workers.dev";
```

## 6. Mettre en ligne

Pousse (push) tous les fichiers du site (y compris `config.js` modifié) sur
ton dépôt GitHub. GitHub Pages se mettra à jour automatiquement.

## Test rapide

Une fois tout configuré, ouvre dans ton navigateur :
```
https://TON-WORKER.workers.dev/player/TONTAG
```
(remplace `TONTAG` par un vrai tag de joueur, sans le `#`). Tu dois voir du
JSON avec les infos du joueur. Si c'est le cas, le tracker et le leaderboard
du site fonctionneront.

## Pourquoi la "TV Royale" n'est pas possible

La TV Royale (spectate en direct) n'est pas exposée par l'API officielle de
Supercell — c'est une fonctionnalité interne au jeu. Aucun site tiers ne peut
y accéder, il n'y a donc rien à développer de ce côté.
