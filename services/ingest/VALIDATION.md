# Validation manuelle du POC DATA

Cette procédure sert à décider si XMLTVFr ou XMLTVFREE peut alimenter le
MVP. TheSportsDB est évalué séparément comme source d'enrichissement.

## 1. Préparer les données

Pour chaque source et chaque journée retenue :

```bash
npm run xmltv:fetch -- --source=xmltvfr
npm run xmltv:day -- --source=xmltvfr --date=YYYY-MM-DD
npm run xmltv:export-csv -- --source=xmltvfr --date=YYYY-MM-DD
```

Le fichier à ouvrir est :

```text
reports/validation-<source>-<date>.csv
```

Premier passage recommandé :

```text
XMLTVFr    : une journée en semaine + une journée de week-end
XMLTVFREE  : uniquement après confirmation que les dates du flux sont actuelles
```

Pour la validation finale, répéter sur au moins 7 jours de snapshots et
collecter les flux toutes les 30 à 60 minutes lorsque leurs conditions le
permettent.

## 2. Annoter le CSV

L'export contient 100 candidats sportifs et 50 non-candidats. Les colonnes
`autoIsSport`, `autoConfidence`, `autoReason` et `autoSport` sont préremplies
par une première analyse heuristique. Elles sont des suggestions, pas la
vérité terrain.

Compléter ou corriger les colonnes manuelles suivantes :

| Colonne | Valeurs attendues |
|---|---|
| `isSport` | `true`, `false` ou `unknown` |
| `sport` | valeur normalisée : football, tennis, rugby, etc. |
| `competition` | compétition ou championnat identifié |
| `participants` | équipes, joueurs ou pilotes identifiés |
| `isLive` | `true`, `false` ou `unknown` |
| `channelCorrect` | `true`, `false` ou `unknown` |
| `timeCorrect` | `true`, `false` ou `unknown` |
| `referenceUrl` | URL de la source officielle consultée |
| `referenceStartAt` | horaire officiel en ISO 8601 avec fuseau |
| `checkedAt` | date/heure de vérification en ISO 8601 |
| `notes` | justification ou anomalie observée |

Règles de classification :

```text
true  = événement, retransmission, replay ou magazine directement sportif
false = fiction, animation, publicité, autopromotion ou programme sans lien
        éditorial réel avec un sport
unknown = information insuffisante, à résoudre avant la décision finale
```

Exemple : `Foot 2 rue` contient le mot « foot », mais doit être marqué `false`
car il s'agit d'une fiction et non d'un programme sportif à regarder.

Pour les programmes éditoriaux (magazine, analyse, résumé), utiliser `true`
si la décision produit est de les afficher dans le guide sport ; sinon les
marquer `false` et documenter la règle dans `notes`.

## 3. Vérifier la couverture

Construire une liste de référence d'au moins 20 événements sportifs réellement
diffusés pendant la journée, à partir de calendriers officiels et des guides
des diffuseurs.

Pour chaque événement de référence, vérifier :

```text
présent dans le flux
chaîne correcte
date et heure correctes à ±5 minutes
titre suffisamment reconnaissable
sport identifiable
compétition identifiable si disponible
participants identifiables si disponibles
```

Ne pas utiliser uniquement le nombre total de programmes : une grille très
complète peut ne contenir aucun événement OTT ou sportif important.

## 4. Calculer les métriques

Sur l'échantillon annoté :

```text
précision = vrais positifs / (vrais positifs + faux positifs)
rappel    = vrais positifs / (vrais positifs + faux négatifs)
```

Mesurer séparément :

```text
couverture des chaînes du panel
rappel des événements sportifs de référence
précision des candidats sportifs
horaires à ±5 minutes
sport correctement identifié
direct correctement identifié
description et participants présents
```

## 5. Valider la fraîcheur

Pendant la période d'observation, consigner les incidents suivants :

```text
programme ajouté le jour même
changement d'horaire
changement de chaîne
annulation
retard ou prolongation
```

Pour chaque incident, enregistrer :

```text
T0 officiel
première collecte où le changement apparaît
délai entre les deux
```

## 6. Tester TheSportsDB

Sélectionner 20 événements XMLTV non ambigus et vérifier :

```text
événement retrouvé
bonne compétition
bons participants
bon identifiant
absence de confusion entre événements similaires
```

TheSportsDB ne doit pas être noté sur la couverture EPG globale. Son résultat
est un taux de matching et une qualité d'enrichissement.

## 7. Seuils de décision de départ

```text
couverture chaînes du panel       ≥ 95 %
rappel événements sportifs        ≥ 90 %
précision candidats sportifs      ≥ 90 %
horaires à ±5 minutes              ≥ 98 %
fraîcheur des changements          ≤ 2 heures au percentile 95
horizon                             ≥ 5 jours
```

Ces seuils sont évalués séparément pour la TV linéaire et l'OTT. Un fournisseur
qui échoue sur la fraîcheur ou dont les droits de publication sont inconnus
ne peut pas être retenu comme source principale, même si sa couverture brute
est élevée.

## 8. Décision

```text
GO         = source principale
GO PARTIEL = source secondaire ou fallback
NO-GO      = source écartée ou conservée uniquement comme référence
```
