# SportToday — POC ingestion

Ce service constitue le squelette du bake-off DATA initial :

```text
XMLTVFr ─┐
         ├─ téléchargement → snapshot brut → parsing → SQLite → rapport
XMLTVFREE┘

TheSportsDB : adaptateur d'enrichissement sportif (étape suivante)
```

EPG.best est volontairement différé et n'est pas configuré dans ce POC.

Les premiers résultats de smoke test sont conservés dans
[`POC-STATUS.md`](./POC-STATUS.md). Ils ne remplacent pas le benchmark de
fraîcheur prévu sur plusieurs jours.

## Prérequis

- Node.js 22.5 ou supérieur ;
- un fichier `.env` basé sur `.env.example` ;
- l'URL directe XMLTVFREE configurée par défaut ; elle peut être remplacée
  dans `.env` si le site la modifie. Le flux public répond actuellement en
  HTTP, donc aucune information sensible ne doit lui être envoyée.

Installer les dépendances :

```bash
npm install
```

## Commandes

Depuis `services/ingest` :

```bash
npm run typecheck
npm run xmltv:fetch
npm run xmltv:fetch -- --source=xmltvfr
npm run xmltv:report
npm run sportsdb:fetch -- --date=2026-08-17
```

`xmltv:fetch` télécharge les flux configurés, conserve chaque snapshot brut
dans `data/raw/<source>/` et importe les chaînes/programmes dans SQLite.
XMLTVFREE est ignoré proprement si `XMLTVFREE_URL` est explicitement vidé.

`sportsdb:fetch` appelle l'endpoint gratuit TheSportsDB pour une journée et
archive le JSON localement. Il s'agit d'un test d'adaptateur, pas encore du
matching entre un programme XMLTV et un événement sportif.

Les snapshots et rapports locaux sont exclus de Git. Cela évite de publier
des données dont les conditions de réutilisation restent à clarifier.

## Structure

```text
src/
├── cli.ts
├── config.ts
├── types.ts
├── sources/
│   ├── data-source.ts
│   ├── xmltv.ts
│   ├── xmltvfr.ts
│   ├── xmltvfree.ts
│   └── thesportsdb.ts
├── storage/
│   ├── snapshot-store.ts
│   └── sqlite.ts
├── xmltv/
│   └── parser.ts
└── reports/
    └── report.ts
```

Le parsing est volontairement limité au socle nécessaire au benchmark :
chaînes, programmes, titres, descriptions, catégories, horaires et présence
de mots-clés sportifs. La classification et le matching TheSportsDB seront
ajoutés dans les étapes DATA suivantes.
