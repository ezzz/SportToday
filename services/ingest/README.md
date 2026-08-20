# SportToday — POC ingestion

Ce service constitue le squelette du bake-off DATA initial :

```text
XMLTVFr ─┐
         ├─ téléchargement → snapshot brut → parsing → SQLite → rapport
XMLTVFREE┘

TheSportsDB : enrichissement et matching indicatif des événements sportifs
```

EPG.best est volontairement différé et n'est pas configuré dans ce POC.

Les premiers résultats de smoke test sont conservés dans
[`POC-STATUS.md`](./POC-STATUS.md). Ils ne remplacent pas le benchmark de
fraîcheur prévu sur plusieurs jours.

La procédure détaillée d'annotation et de décision est dans
[`VALIDATION.md`](./VALIDATION.md).

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
npm test
npm run xmltv:fetch
npm run xmltv:fetch -- --source=xmltvfr
npm run xmltv:report
npm run xmltv:day -- --source=xmltvfr --date=2026-08-17
npm run xmltv:tonight -- --source=xmltvfr --limit=12
npm run validation:web -- --source=xmltvfr --limit=12
npm run xmltv:export-csv -- --source=xmltvfr --date=2026-08-17
npm run sportsdb:fetch -- --date=2026-08-17
```

## Validation produit « aujourd’hui / ce soir »

Le parcours recommandé pour le POC est désormais la sélection courte :

```bash
npm run xmltv:tonight -- --source=xmltvfr --limit=12
npm run validation:web -- --source=xmltvfr --limit=12
```

Sans `--date`, les deux commandes utilisent automatiquement la date du jour en
`Europe/Paris`. L'option reste disponible pour rejouer une date historique :

```bash
npm run validation:web -- --source=xmltvfr --date=2026-08-20 --limit=12
```

La première commande sélectionne et classe les événements de la journée
jusqu'à 00 h 30 en `Europe/Paris`, regroupe leurs diffusions et écrit :

```text
reports/tonight-xmltvfr-2026-08-17.json
```

La seconde démarre l'interface locale sur `http://127.0.0.1:4173`. La vue
initiale affiche les directs confirmés ou probables de la soirée. Un événement
commencé avant 20 h reste visible s'il se termine après 20 h. Les filtres donnent
accès aux statuts `À confirmer`, aux différés, aux émissions, à la journée
complète et à un ou plusieurs sports. Les heures de début et de fin sont
affichées. La liste des sports est construite à partir des résultats du jour et
`Tous les sports` est actif par défaut. `--limit=12`
limite chaque vue filtrée aux douze résultats les mieux classés, avec au plus
deux cartes par compétition, et non le nombre total de programmes indexés.

Chaque événement se valide en un clic avec `OK`, `Doute` ou une raison
d'erreur. Les commentaires sont facultatifs. La sauvegarde est automatique
dans :

```text
reports/validation-poc2-tonight-xmltvfr-2026-08-17.json
```

Ce fichier est directement lisible par l'assistant une fois la validation
terminée. L'interface permet aussi de télécharger la vue `Programme + Période`
active :

- un CSV UTF-8 avec séparateur `;`, ouvert directement par Excel français ;
- un fichier XLSX avec filtres, en-têtes figés et colonnes dimensionnées.

Le serveur écoute uniquement sur `127.0.0.1`. `Ctrl+C` l'arrête.

`xmltv:fetch` télécharge les flux configurés, conserve chaque snapshot brut
dans `data/raw/<source>/` et importe les chaînes/programmes dans SQLite.
XMLTVFREE est ignoré proprement si `XMLTVFREE_URL` est explicitement vidé.

`sportsdb:fetch` appelle l'endpoint gratuit TheSportsDB pour une journée et
archive le JSON localement. L'option `--with-sportsdb` de `xmltv:export-csv`
effectue le même téléchargement puis tente un matching conservateur entre les
programmes XMLTV et les événements retournés.

```bash
npm run xmltv:export-csv -- --source=xmltvfr --date=2026-08-17 --with-sportsdb
```

Le matching utilise les participants, la compétition, le sport et la
proximité horaire. Il ajoute dans le CSV les colonnes `sportsDbEventId`,
`sportsDbMatchConfidence`, `sportsDbStartAt`, `sportsDbTimeDeltaMinutes` et
`sportsDbLiveEvidence`. Lorsqu'un événement est retrouvé et que son début est
aligné sur le programme, `autoIsLive` peut devenir `true`, mais la ligne reste
à vérifier : il s'agit d'une preuve indirecte, pas d'une confirmation de
droits ou de diffusion en direct.

`xmltv:day` filtre les programmes qui commencent pendant une journée en
`Europe/Paris`, produit un rapport JSON et affiche les 20 premiers candidats
sportifs. Le mot « candidat » est volontaire : la classification par mots-clés
doit encore être évaluée manuellement sur un échantillon. Les programmes
commencés la veille et encore en cours sont réservés à une future vue
« maintenant ». Le premier classifieur est volontairement conservateur et
utilise le titre et les catégories, pas la description souvent générique. Le
rapport conserve les signaux qui ont déclenché la classification afin de
mesurer les faux positifs et les faux négatifs.

`xmltv:export-csv` produit un échantillon déterministe destiné à la validation :
100 candidats sportifs et 50 non-candidats par défaut. Les lignes sont triées
par catégorie (`Sport Live`, `Sport différé`, `Emission`), puis par horaire et
chaîne.

Les colonnes `contentCategory`, `autoIsSport`, `autoConfidence`, `autoReason`,
`autoSport`, `autoCompetition`, `autoParticipants`, `autoIsLive`,
`checkRequired` et `checkReason` contiennent des propositions automatiques
basées sur le titre, la description, les catégories et les signaux sportifs.
Avec `--with-sportsdb`, `autoIsLive` peut aussi utiliser le rapprochement avec
l'horaire et le statut TheSportsDB.
`checkRequired=true` indique qu'une vérification humaine est recommandée.

Les colonnes manuelles vides `isSport`, `sport`, `competition`, `participants`,
`isLive`, `channelCorrect`, `timeCorrect`, `referenceUrl`, `referenceStartAt`,
`checkedAt` et `notes` restent la référence pour mesurer la qualité réelle du
flux. En particulier, la chaîne, l'horaire et la référence officielle ne sont
pas considérés comme validés par l'heuristique.

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
├── sportsdb/
│   └── events.ts
├── reports/
│   ├── auto-annotation.ts
│   ├── day-filter.ts
│   ├── report.ts
│   ├── sportsdb-match.ts
│   ├── tonight.ts
│   └── validation-csv.ts
└── validation/
    ├── export.ts
    ├── server.ts
    ├── store.ts
    └── ui.ts
```

Le parsing est volontairement limité au socle nécessaire au benchmark :
chaînes, programmes, titres, descriptions, catégories, horaires et présence
de mots-clés sportifs. Le matching TheSportsDB reste volontairement
conservateur et doit être mesuré sur des événements de référence avant toute
utilisation en production.
