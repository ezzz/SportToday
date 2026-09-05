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

La qualification par créneau de POC-2.1 est synthétisée dans
[`POC21-RESULTS.md`](./POC21-RESULTS.md). Le matching XMLTVFr ↔ TheSportsDB
prévu juste après sa validation est conservé dans
[`POC3-PLAN.md`](./POC3-PLAN.md), avec les premiers résultats dans
[`POC3-RESULTS.md`](./POC3-RESULTS.md).

La procédure détaillée d'annotation et de décision est dans
[`VALIDATION.md`](./VALIDATION.md).

Le pivot vers une synthèse orientée événements est cadré dans
[`POC4-PLAN.md`](./POC4-PLAN.md). La vue événementielle viendra compléter la
vue XMLTV classique, qui restera utile pour contrôler l'exhaustivité.

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
npm run sportsdb:poc3 -- --source=xmltvfr --date=2026-08-21 --limit=8
npm run poc4:report -- --source=xmltvfr --date=2026-08-23 --limit=10
npm run poc4:web -- --source=xmltvfr --date=2026-08-23 --limit=10
npm run poc4:coverage -- --source=xmltvfr --date=2026-08-23 --refresh-events
```

Pour utiliser l'interface depuis un téléphone connecté au Wi-Fi d'un PC
Windows, suivre [`WINDOWS-LAN.md`](./WINDOWS-LAN.md). Le script
[`scripts/run-poc4-windows.ps1`](../../scripts/run-poc4-windows.ps1) installe,
compile et lance le serveur sur le réseau privé.

## POC-4.1 — vue orientée événements

POC-4.1 récupère d'abord les événements de référence puis rattache les créneaux
XMLTVFr à leur horaire officiel lorsque cela est possible. Football vient
d'API-Football et la F1 de Jolpica. Le même catalogue accepte désormais
Volleyball via API-Sports, Tennis via API-Tennis (clé distincte), Golf via le
scoreboard public ESPN et la Diamond League via la page calendrier World
Athletics.

La clé API-Football doit rester uniquement dans `.env` :

```dotenv
API_FOOTBALL_KEY=...
API_VOLLEYBALL_KEY=...
API_TENNIS_KEY=...
ESPN_GOLF_ENABLED=true
WORLD_ATHLETICS_URL=https://worldathletics.org/competitions/diamond-league/calendar-results
```

API-Volleyball réutilise par défaut `API_FOOTBALL_KEY` et reste limité aux
compétitions suivies (Champions League, Nations League, EuroVolley, Ligue A,
etc.). API-Tennis est une source séparée et reste inactive tant que
`API_TENNIS_KEY` n'est pas renseignée. Le connecteur Golf ESPN et le calendrier
World Athletics sont des ajouts de POC : ils peuvent être désactivés ou
remplacés si leurs conditions d'utilisation ou leur stabilité ne conviennent
pas. Les horaires Diamond League issus d'un calendrier journalier sans heure
sont marqués « estimés ».

Les réponses sont mises en cache sous `data/raw/<source-evenement>` (par
exemple `api-football`, `api-volleyball`, `api-tennis`, `espn-golf`,
`world-athletics` et `jolpica-f1`). Utiliser `--refresh-events` uniquement pour
forcer une nouvelle requête :

```bash
npm run poc4:report -- --source=xmltvfr --date=2026-08-23 --refresh-events
```

La page POC-4 propose deux vues : `À voir`, construite depuis le catalogue
d'événements, et `Agenda TV`, qui conserve la sélection XMLTV
historique comme contrôle secondaire. En mode web, les boutons `Aujourd'hui`,
`Demain` chargent les deux rapports préparés au lancement.

Dans `À voir`, une courte section `À ne pas manquer` met en avant les événements
les mieux classés avec un diffuseur identifié, puis les résultats sont regroupés
par sport et compétition sur des lignes compactes. Les plateformes de streaming
issues d'une règle de droits sont distinctes des chaînes XMLTV. Un événement
officiel sans chaîne ni plateforme est conservé dans l'agenda avec le libellé
`Diffuseur non identifié` ; le filtre `Différé` reste séparé.

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
initiale regroupe les directs identifiés et les événements à compléter
de la soirée. Un événement
commencé avant 20 h reste visible s'il se termine après 20 h. Les filtres donnent
accès au groupe `Direct`, aux différés, aux émissions, à la journée
complète et à un ou plusieurs sports. Les heures de début et de fin sont
affichées. Depuis POC-2.1, le statut et le filtre s'appliquent à chaque créneau
de diffusion : une rediffusion d'une carte mixte n'apparaît plus dans
`Direct`. La liste des sports est construite à partir des résultats du jour et
`Tous les sports` est actif par défaut. `--limit=12`
limite chaque vue filtrée aux douze résultats les mieux classés, avec au plus
deux cartes par compétition, et non le nombre total de programmes indexés.

Le serveur actualise XMLTV et les catalogues d'événements automatiquement toutes
les six heures par défaut. Modifier l'intervalle avec `--refresh-hours=12`, ou
le désactiver avec `--refresh-hours=0`. Les réponses brutes restent archivées
sous `data/raw/` et les validations déjà effectuées sont conservées quand les
identifiants d'événements restent stables.

Sur Windows, [`scripts/watch-poc4-windows.ps1`](../../scripts/watch-poc4-windows.ps1)
peut surveiller la branche POC toutes les quinze minutes. Lorsqu'un nouveau
commit est publié, le script fait un `git pull --ff-only` puis relance le site.
Voir [`WINDOWS-LAN.md`](WINDOWS-LAN.md) pour l'installation et la configuration
optionnelle dans le Planificateur de tâches.

Chaque événement se valide en un clic avec `OK`, `Doute` ou une raison
d'erreur. Les commentaires sont facultatifs. La sauvegarde est automatique
dans :

```text
reports/validation-poc21-tonight-xmltvfr-2026-08-17.json
```

Ce fichier est directement lisible par l'assistant une fois la validation
terminée. L'interface permet aussi de télécharger la vue `Programme + Période`
active :

- un CSV UTF-8 avec séparateur `;`, ouvert directement par Excel français ;
- un fichier XLSX avec filtres, en-têtes figés et colonnes dimensionnées.

Le serveur écoute uniquement sur `127.0.0.1` par défaut. Le script Windows
utilise explicitement `0.0.0.0` pour le réseau privé local. `Ctrl+C` l'arrête.

Le POC-4.3A ajoute un audit de couverture des chaînes prioritaires. Chaque
rapport POC-4 écrit désormais aussi `reports/poc4-coverage-<source>-<date>.json`
et la page web affiche les chaînes alimentées, présentes mais vides ou
absentes du répertoire XMLTV, ainsi que les événements officiels sans
diffusion rattachée. Pour générer uniquement ce diagnostic, utiliser
`npm run poc4:coverage`. La liste des chaînes est une watchlist de contrôle et
ne constitue pas une information de droits TV.

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

`sportsdb:poc3` évite la limite très restrictive de la requête journalière
gratuite en recherchant chaque affiche Football séparément. Il compare ensuite
l'heure de diffusion XMLTV à l'heure de l'événement, teste les diffuseurs
retournés et écrit `reports/poc3-sportsdb-<source>-<date>.json`. Le panel est
plafonné à huit affiches pour respecter les 30 requêtes/minute de la clé
publique.

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
│   ├── thesportsdb.ts
│   ├── api-football.ts
│   ├── api-volleyball.ts
│   ├── api-tennis.ts
│   ├── espn-golf.ts
│   ├── world-athletics.ts
│   └── jolpica-f1.ts
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
