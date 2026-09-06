# POC-4 — synthèse orientée événements

Statut : **POC-4.3A — audit de couverture EPG implémenté, à mesurer sur des journées réelles**.

## Objectif

Vérifier qu'une vue construite à partir des événements sportifs principaux est
plus lisible et plus utile qu'une vue construite directement à partir des
programmes XMLTV.

XMLTV reste la source des créneaux de diffusion et des chaînes. Il ne doit pas
porter seul la décision de ce qui est un événement important.

## Hypothèse

La qualité de la synthèse dépend de trois couches distinctes :

```text
catalogue d'événements
        ↓
priorité éditoriale SportToday
        ↓
diffusions XMLTV et diffuseurs attendus
```

Les événements ne seront pas listés individuellement en dur. Seules les
compétitions suivies, les règles de priorité et les éventuelles équipes
prioritaires seront configurées.

## Périmètre V1

### Football

- Ligue des champions, Ligue Europa et Ligue Conférence ;
- Ligue 1 et Coupe de France ;
- principales affiches de Premier League, Liga, Serie A et Bundesliga ;
- priorité aux clubs français en coupes européennes ;
- finales, phases éliminatoires et grandes affiches avant les rencontres
  ordinaires.

Les droits français variant selon la saison, la relation compétition →
diffuseur sera une configuration vérifiable, et non une vérité codée dans le
modèle.

### Tennis

- quatre tournois du Grand Chelem ;
- ATP Masters 1000 et WTA 1000 ;
- ATP Finals et WTA Finals ;
- finales de Coupe Davis et Billie Jean King Cup ;
- demi-finales et finales de certains tournois 500 en extension.

Le modèle doit accepter un horaire estimé ou une session de tournoi lorsque
l'heure exacte d'un match n'est pas encore connue.

### Formule 1

- tous les Grands Prix ;
- course, qualifications et sprint en priorité ;
- essais libres visibles mais secondaires.

### Golf

- quatre Majeurs ;
- Ryder Cup ;
- principaux événements PGA Tour et DP World Tour ;
- extension LIV uniquement si la couverture française est exploitable.

Pour le golf, l'unité affichée sera généralement le tournoi et la journée ou
le tour, plutôt qu'une ligne par programme XMLTV.

## Modèle canonique minimal

```text
SportEvent
- id stable et source
- sport
- compétition
- étape / tour / session
- participants ou intitulé
- eventStart / eventEnd (heure officielle)
- importance (A, B, C)
- source et niveau de confiance
- broadcasts[]
  - broadcastStart / broadcastEnd
  - chaîne ou plateforme
  - direct, différé ou à confirmer
  - provenance (EPG XMLTV ou règle de droits), preuve et confiance
```

`eventStart` et `broadcastStart` doivent rester deux champs différents. Une
diffusion peut commencer avant le coup d'envoi, couvrir une fenêtre de golf,
ou être une rediffusion.

## Sources candidates

Le POC testera une source événementielle par sport et conservera XMLTVFr comme
source EPG principale :

| Sport | Source POC | Rôle |
|---|---|---|
| Football | [API-Football](https://api-sports.io/sports/football) ou [football-data.org](https://www.football-data.org/pricing) | calendrier, équipes, compétition |
| Volleyball | [API-Volleyball](https://api-sports.io/sports/volleyball) | matchs, compétitions et horaires |
| Tennis | XMLTVFr/XMLTVFree + scoreboard public ESPN ATP/WTA | tournoi diffusé et chaînes ; une synthèse ATP et une WTA avec matchs/horaires |
| F1 | [Jolpica F1](https://github.com/jolpica/jolpica-f1) | calendrier et sessions |
| Golf | ESPN scoreboard public (adaptateur POC) | tournoi et journée ; à remplacer par une API sous licence si nécessaire |
| Athlétisme | [World Athletics Diamond League](https://worldathletics.org/competitions/diamond-league/calendar-results) | calendrier des étapes ; horaires journaliers parfois estimés |

TheSportsDB reste une piste d'enrichissement multifournisseur, jamais une source
de complétude Tennis. Son offre gratuite est trop limitée pour découvrir
exhaustivement une journée. Une API Tennis payante ne sera réévaluée que si
l'usage montre que le détail des joueurs apporte une valeur suffisante.

Jolpica est retenu uniquement pour le POC non commercial. Ses conditions
actuelles imposent de contacter le fournisseur avant tout usage commercial en
production.

## Flux fonctionnel

1. Charger la watchlist des compétitions et règles de priorité.
2. Récupérer les événements du jour et des prochains jours.
3. Normaliser les noms, horaires, compétitions et participants.
4. Appliquer le classement éditorial et limiter la vue principale à 5–10
   événements.
5. Rechercher les créneaux XMLTV proches de chaque événement.
6. Regrouper les chaînes et rediffusions dans la fiche événement.
7. Afficher la vue principale « À voir ».
8. Conserver la vue XMLTV « Agenda TV » comme vue secondaire et
   outil de contrôle d'exhaustivité.

En mode web, aujourd'hui et demain sont préparés au lancement. Le bouton
de date recharge le rapport et son fichier de validation sans mélanger les
annotations entre journées.

Dans « À voir », les trois événements les mieux classés avec une chaîne ou une
plateforme identifiée sont présentés dans « À ne pas manquer ». Le reste est
regroupé par sport puis compétition, avec les matchs affichés sur des lignes
compactes. Les plateformes issues d'une règle de droits sont affichées à côté
de l'heure officielle, même lorsqu'aucun canal linéaire XMLTV n'existe.
Le filtre `Direct` regroupe les événements sportifs et conserve les événements
du catalogue sans diffuseur identifié dans l'agenda. Le filtre `Différé` reste
séparé pour ne pas les mettre en avant.

Chaque ligne événementielle affiche l'heure officielle et l'intitulé sur la
même ligne. Les tags et la validation ponctuelle sont repliés. Une diffusion
est colorée en vert lorsqu'elle est déclarée directe, ou lorsqu'elle est
`Direct probable` et que son début est aligné à quinze minutes près sur
l'horaire officiel. La barre supérieure conserve uniquement Vue et Date ; les
autres critères sont regroupés dans un panneau repliable. Le serveur actualise
XMLTV et les catalogues en tâche planifiée, sans nécessiter une action utilisateur.
Les métriques et le contrôle d'exhaustivité sont placés sous les résultats.

## Critères de validation

Le POC4 sera considéré concluant si, sur un panel de plusieurs journées :

- les principaux événements attendus sont retrouvés ;
- les doublons de programmes sont nettement réduits ;
- l'horaire officiel est distingué de l'horaire de diffusion ;
- la chaîne et la fenêtre de diffusion sont correctement rattachées ;
- les rediffusions ne remontent pas dans la vue principale par défaut ;
- les événements sans correspondance EPG restent visibles avec un statut
  explicite ;
- les horaires instables du tennis et les fenêtres longues du golf ne sont pas
  artificiellement présentés comme des horaires certains.

Mesures minimales : rappel des événements prioritaires, précision des
correspondances fortes, taux de doublons, taux de chaînes correctes et taux de
faux directs.

## Découpage d'implémentation

### POC-4.1 — verticales Football + F1

Construire le modèle canonique, la watchlist, le classement, le rattachement
XMLTV et la nouvelle vue. Football représente le cas de densité élevée ; F1
représente le cas d'un calendrier structuré.

### POC-4.2 — Volleyball + Tennis + Golf + Athlétisme

Ajouter les matchs et sessions, horaires estimés, fenêtres de diffusion et
regroupement par tournoi/étape. API-Volleyball est activée avec la clé
API-Sports existante. Le Tennis est limité aux tournois présents dans XMLTV puis
enrichi par ESPN, sans dépendance à une API payante. Deux lignes au maximum sont
affichées par tournoi (ATP Hommes et WTA Femmes), avec tous les horaires en
sous-titre fin. Les connecteurs Tennis, Golf et Diamond League sont
explicitement des solutions de POC et devront être
requalifiés avant une utilisation durable.

### POC-4.3A — audit de couverture EPG

Cette sous-étape précède la décision de changer de fournisseur. Elle sépare
les chaînes absentes du flux, les chaînes présentes mais sans programme sur la
journée, et les événements officiels sans programme XMLTV rattaché.

Le rapport `poc4-coverage-<source>-<date>.json` contient :

- une watchlist de chaînes sportives françaises et les variantes de leurs noms
  XMLTV ;
- le nombre de programmes et de candidats sportifs par chaîne ;
- les chaînes prioritaires alimentées, vides ou absentes du répertoire source ;
- les événements du catalogue rattachés ou non à une diffusion XMLTV ;
- les erreurs éventuelles des sources événementielles.

La page web affiche ces indicateurs dans le panneau d'exhaustivité placé sous
les résultats. La watchlist est un outil de diagnostic et n'encode pas les
droits de diffusion d'une compétition.

Les droits validés pour le POC sont gérés séparément dans
`src/events/rights.ts`. Pour la saison 2026/2027, LaLiga est couverte par DAZN
et Disney+, et la Serie A par DAZN. Ces règles sont datées et leurs URLs de
preuve sont conservées dans les rapports et la justification de l'événement ; elles ne remplacent
pas un futur catalogue de droits administrable.

Commande dédiée :

```bash
npm run poc4:coverage -- --source=xmltvfr --date=YYYY-MM-DD --refresh-events
```

### POC-4.3B — décision fournisseurs

Comparer couverture, fraîcheur, qualité des horaires et coût. Conserver
TheSportsDB comme enrichissement facultatif si sa couverture apporte une valeur
mesurable, sans en faire une dépendance de la vue Tennis.

## Hors périmètre

- automatisation de la collecte de la page L'Équipe ;
- gestion complète des droits TV ;
- personnalisation par utilisateur ;
- couverture de tous les sports et toutes les compétitions ;
- remplacement de la vue programme TV classique.
