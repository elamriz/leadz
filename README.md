# LeadForge 🚀

LeadForge est une plateforme moderne de génération de leads B2B tout-en-un. Elle permet de trouver des prospects via Google Maps, d'enrichir leurs données (emails, sites web), de les scorer automatiquement et de lancer des campagnes d'emailing personnalisées.

![LeadForge Dashboard](https://via.placeholder.com/800x450?text=LeadForge+Dashboard+Preview)

## ✨ Fonctionnalités Clés

### 🔍 Recherche & Découverte
- **Intégration Google Maps API** : Trouvez des entreprises locales précises par mot-clé (ex: "Restaurant", "Plombier") et localisation via l'API Google Maps.
- **Filtres Avancés** : Ciblez par rayon, nombre de résultats, et plus encore.
- **Estimation des Coûts** : Voyez le coût estimé (basé sur l'API Google) avant de lancer une recherche.

### ⚡ Enrichissement de Données
- **Scraping Intelligent** : Visite automatiquement les sites web des prospects pour trouver des emails de contact.
- **Vérification** : Valide les emails trouvés pour réduire les rebonds.

### 🎯 Lead Scoring (Notation)
- **Algorithme Personnalisable** : Définissez vos propres critères de score (ex: présence d'un site web, note Google > 4.5, e-mail trouvé).
- **Priorisation** : Les leads sont classés (Chaud, Tiède, Froid) pour vous concentrer sur les meilleures opportunités.

### 📧 Gestion de Campagnes
- **Séquences Automatisées** : Créez des campagnes d'emailing avec des templates personnalisés.
- **Variables Dynamiques** : Utilisez `{company_name}`, `{city}`, `{website}` pour personnaliser chaque message.
- **Suivi** : Suivez les envois, les taux d'ouverture et de réponse.

### 📊 Dashboard Analytique
- **Vue d'ensemble** : Suivez vos KPI en temps réel (Leads générés, Taux de réponse, Coûts API).
- **Gestion des Quotas** : Configurez des limites quotidiennes/mensuelles pour contrôler vos dépenses API.

## 🛠️ Stack Technique

Ce projet utilise les dernières technologies web pour une performance et une maintenabilité optimales :

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **Base de Données** : [PostgreSQL](https://www.postgresql.org/)
- **ORM** : [Prisma 7](https://www.prisma.io/) (avec `@prisma/adapter-pg` pour connexion directe)
- **UI** : React 19, Tailwind CSS (Design System personnalisé pour le thème sombre "Premium")
- **APIs** : Google Places API, SMTP

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+
- PostgreSQL (ou une instance Prisma Postgres)
- Clé API Google Maps (avec Places API activé)

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/leadforge.git
cd leadforge
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Créez un fichier `.env` à la racine du projet (ou copiez `.env.example`) et ajoutez vos clés :

```bash
# Base de données (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/leadforge?schema=public"

# Google Maps (Obligatoire pour la recherche)
GOOGLE_MAPS_API_KEY="votre_cle_api_google_maps"

# SMTP (Optionnel pour l'envoi d'emails)
SMTP_HOST="smtp.votre-fournisseur.com"
SMTP_PORT="587"
SMTP_USER="votre@email.com"
SMTP_PASS="votre_mot_de_passe"
```

### 4. Initialiser la base de données
```bash
# Génère le client Prisma et applique les migrations
npx prisma migrate dev --name init
```

### 5. Lancer le serveur de développement
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir l'application.

## 📂 Structure du Projet

```
src/
├── app/              # Routes Next.js (App Router)
│   ├── api/          # Endpoints API (Backend)
│   ├── campaigns/    # Page Campagnes
│   ├── leads/        # Page Gestion des Leads
│   ├── search/       # Page Recherche
│   └── settings/     # Page Paramètres
├── components/       # Composants Réutilisables (UI)
├── lib/              # Utilitaires (Prisma, Helpers)
└── types/            # Définitions TypeScript
prisma/
└── schema.prisma     # Schéma de base de données
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une Pull Request.

## 📄 Licence

Ce projet est sous licence MIT.
