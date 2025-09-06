# File Tagger Pro

## Project info

Application de gestion et recherche de documents avec tags, similarités sémantiques et stockage MEGA.

## How can I edit this code?

There are several ways of editing your application.

**Développement local (IDE)**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Éditer un fichier directement dans GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Backend (Netlify Functions + Prisma + MEGA)

Le dossier `netlify/functions` contient les fonctions serverless (auth, fichiers, dossiers, tags, etc.). Elles utilisent Prisma (PostgreSQL) et l'API MEGA via `megajs`.

### Variables d'environnement à définir sur Netlify

| Nom | Description |
|-----|-------------|
| DATABASE_URL | URL Postgres (format Prisma) |
| JWT_SECRET | Secret JWT pour la génération des tokens |
| ENCRYPTION_SECRET_KEY | Clé hex (256 bits recommandé) pour chiffrer les credentials MEGA |
| MEGA_EMAIL | Email du compte MEGA par défaut |
| MEGA_PASSWORD | Mot de passe MEGA par défaut |

Générez une clé de chiffrement (64 hex chars):
```bash
openssl rand -hex 32
```

### Développement local (avec Netlify CLI)
```bash
npm install
npx prisma generate
netlify dev
```
Accès API: `http://localhost:8888/.netlify/functions/auth/login` (ou via redirect `/api/...`).

### Déploiement
1. Connecter le repo à Netlify.
2. Configurer les variables d'environnement ci-dessus dans Site Settings > Environment Variables.
3. Déployer (build commande: `npm run build`). `postinstall` exécute `prisma generate` automatiquement sur Netlify.

### Structure importante
| Dossier/Fichier | Rôle |
|-----------------|------|
| `netlify/functions/*.mts` | Endpoints serverless |
| `netlify/files.core/src/services/` | Logique métier (Prisma, MEGA, encryption) |
| `prisma/schema.prisma` | Schéma base de données |
| `netlify.toml` | Configuration build + fonctions + redirects |

### Notes de performance
- `node_bundler=esbuild` optimise les temps de cold start.
- Les modules lourds (`@prisma/client`, `megajs`) sont externalisés.
- Rajouter un pool de connexions n'est pas nécessaire car Prisma gère le pooling côté driver Postgres.

### Migrations
Exécuter localement:
```bash
npx prisma migrate dev --name init
```
En production, appliquez les migrations avant ou pendant le premier déploiement (Netlify build + plugin Prisma).

### Sécurité
- Changez immédiatement le `JWT_SECRET` de développement.
- Ne commitez jamais les credentials MEGA en clair; ils sont chiffrés via `EncryptionService`.
- Activez les logs dans Netlify pour monitorer les fonctions.

## Déploiement

Netlify (fonctions + SPA). Configurez les variables d’environnement et déployez via l’interface ou la CLI.
