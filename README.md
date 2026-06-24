# OJADA BANK — Application React

## Installation et démarrage (Windows)

### 1. Prérequis
- Node.js installé (vérifiez avec `node --version`)
- VS Code installé

### 2. Installer les dépendances
Ouvrez PowerShell dans ce dossier et tapez :
```
npm install
```

### 3. Lancer en local
```
npm start
```
Le site s'ouvre automatiquement sur http://localhost:3000

### 4. Build pour hébergement
```
npm run build
```
Le dossier `build/` contient votre site prêt à déployer.

## Structure du projet
```
src/
  pages/
    Landing.js          → Page d'accueil publique
    ClientDashboard.js  → Espace client
    AdminDashboard.js   → Interface administration
  components/
    DashboardLayout.js  → Layout partagé (sidebar responsive)
  App.js               → Routeur principal
  index.css            → Styles globaux
```

## Routes
- `/`        → Page d'accueil
- `/client`  → Dashboard client (Kofi Mensah)
- `/admin`   → Dashboard administrateur

## Hébergement gratuit recommandé
1. Netlify : glissez-déposez le dossier `build/`
2. Vercel : connectez votre repo GitHub
