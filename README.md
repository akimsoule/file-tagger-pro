# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/47fe2811-8e06-4341-bf73-412f19e5b2eb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/47fe2811-8e06-4341-bf73-412f19e5b2eb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

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

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/47fe2811-8e06-4341-bf73-412f19e5b2eb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
