# POC-3 — matching XMLTVFr avec TheSportsDB

Statut : **première passe gratuite exécutée le 21 août 2026**.

Les résultats sont conservés dans
[`POC3-RESULTS.md`](./POC3-RESULTS.md). Le matching ciblé retrouve 3 des 8
affiches Football du panel, contre zéro avec la collecte journalière globale.

## Question à trancher

TheSportsDB peut-il enrichir une diffusion XMLTVFr non marquée avec un
événement sportif suffisamment fiable pour distinguer :

```text
horaire de diffusion proche du coup d'envoi  → direct probable
diffusion postérieure au déroulement réel    → différé probable
correspondance insuffisante                  → à confirmer
```

TheSportsDB ne sera pas traité comme une source de programme TV. Il apportera
une heure de début d'événement et une identité sportive à comparer au créneau
XMLTVFr.

## Périmètre initial

Commencer par le football, où l'identité des deux équipes et l'heure de début
sont généralement déterministes. Le panel de départ comprendra notamment :

- Arsenal / Coventry City ;
- Marseille / Strasbourg ;
- Lens / Paris-SG ;
- quelques matchs de Ligue 3 ;
- un cas volontairement ancien ou rediffusé.

Le Golf, le Tennis et le Cyclisme viendront ensuite. Pour ces sports, l'heure
d'un événement global ne suffit souvent pas à identifier le match, le tour ou
la session réellement diffusée.

## Méthode prévue

1. Construire une identité XMLTV normalisée à partir du titre, du sous-titre,
   du sport, de la compétition et des participants.
2. Interroger TheSportsDB sur la date de l'événement, avec une marge d'un jour
   pour les fuseaux horaires.
3. Normaliser les noms d'équipes et de compétitions : accents, sponsors,
   abréviations et variantes usuelles.
4. Générer des candidats du même sport puis calculer un score explicable :
   participants, compétition, date et proximité horaire.
5. Conserver l'identifiant TheSportsDB, le score, l'écart horaire et les
   raisons du rapprochement.
6. Appliquer une tolérance dépendante du sport. Pour le football, distinguer
   l'heure d'antenne du coup d'envoi ; ne pas transposer cette règle telle
   quelle au Tennis, au Golf ou au Cyclisme.
7. Ne promouvoir en `Direct probable` que les correspondances fortes. Une
   correspondance moyenne reste `À confirmer` et aucune correspondance ne
   dégrade le résultat XMLTV existant.

## Mesures de décision

Le rapport POC-3 devra publier :

```text
taux de matching des événements ciblés
précision des correspondances fortes
écart diffusion TV / début sportif
directs correctement récupérés
rediffusions correctement détectées
faux rapprochements
événements absents de l'offre gratuite
```

Seuil recommandé avant toute promotion automatique : au moins 95 % de
précision sur les correspondances fortes du panel. Le taux de couverture sera
mesuré séparément : un faible rappel est acceptable au début, un faux direct
dans la vue principale l'est beaucoup moins.

## Décision attendue

Le POC doit déterminer si :

- l'offre gratuite suffit pour un enrichissement ciblé ;
- une requête plus précise par ligue ou équipe est nécessaire ;
- un test Premium limité dans le temps est justifié ;
- TheSportsDB doit rester optionnel pour les sports difficiles à apparier.

La prochaine passe doit automatiser la mesure sur plusieurs dates avant toute
décision d'abonnement ou promotion dans le classement principal.
