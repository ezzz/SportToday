# POC-4 — synthèse orientée événements

Statut : **POC-4.1 en cours d'implémentation depuis le 23 août 2026**.

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
  - chaîne / plateforme
  - direct, différé ou à confirmer
  - preuve et confiance
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
| Tennis | [Live Tennis API](https://docs.livetennisapi.com/) | tournois, matchs à venir, horaires évolutifs |
| F1 | [Jolpica F1](https://github.com/jolpica/jolpica-f1) | calendrier et sessions |
| Golf | [SlashGolf](https://slashgolf.dev/) | calendrier et tournois PGA/LIV |

TheSportsDB reste une piste multifournisseur. Son offre gratuite est trop
limitée pour découvrir exhaustivement une journée ; son offre Premium ne sera
testée que si les sources spécialisées ne donnent pas un résultat suffisant.

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
7. Afficher la vue principale « À la une ».
8. Conserver la vue XMLTV « Tous les programmes » comme vue secondaire et
   outil de contrôle d'exhaustivité.

En mode web, trois dates consécutives sont préparées au lancement. Le bouton
de date recharge le rapport et son fichier de validation sans mélanger les
annotations entre journées.

Dans « À la une », les événements sont regroupés par compétition et les
compétitions sont triées par la priorité du meilleur événement du groupe. Le
filtre `Direct + à confirmer` regroupe les événements sportifs et conserve les
événements du catalogue sans diffusion XMLTV, signalés en jaune. Le filtre
`Différé` reste séparé pour ne pas mettre les rediffusions en avant.

Chaque ligne événementielle affiche l'heure officielle et l'intitulé sur la
même ligne. Les tags et la validation ponctuelle sont repliés. Une diffusion
est colorée en vert lorsqu'elle est déclarée directe, ou lorsqu'elle est
`Direct probable` et que son début est aligné à quinze minutes près sur
l'horaire officiel.

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

### POC-4.2 — Tennis + Golf

Ajouter les sessions, horaires estimés, fenêtres de diffusion et regroupement
par tournoi.

### POC-4.3 — décision fournisseurs

Comparer couverture, fraîcheur, qualité des horaires et coût. Décider si
TheSportsDB Premium est nécessaire ou si les sources spécialisées suffisent.

## Hors périmètre

- automatisation de la collecte de la page L'Équipe ;
- gestion complète des droits TV ;
- personnalisation par utilisateur ;
- couverture de tous les sports et toutes les compétitions ;
- remplacement de la vue programme TV classique.
