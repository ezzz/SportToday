# Validation manuelle du POC DATA

Cette procédure sert à décider si XMLTVFr ou XMLTVFREE peut alimenter le
MVP. TheSportsDB est évalué séparément comme source d'enrichissement.

## Parcours recommandé : valider la promesse produit

La validation principale porte sur la question « quel sport regarder ce
soir ? », avec une sélection courte plutôt que 150 lignes à annoter :

```bash
npm run xmltv:tonight -- --source=xmltvfr --date=YYYY-MM-DD --limit=12
npm run validation:web -- --source=xmltvfr --date=YYYY-MM-DD --limit=12
```

Pour un test réel le jour même, omettre simplement `--date` :

```bash
npm run validation:web -- --source=xmltvfr --limit=12
```

Ouvrir `http://127.0.0.1:4173`. Le parcours prioritaire est présélectionné :

```text
Programme : Direct
Période   : Soirée, à partir de 20 h
```

Depuis POC-2, le programme par défaut est `Direct` : il contient uniquement les
directs confirmés ou probables. Les statuts sans preuve suffisante sont isolés
dans `À confirmer`. Les filtres `À confirmer`, `Différé`, `Émission`,
`Aujourd'hui · journée complète` et `Sport`
permettent d'étendre le contrôle. Le filtre Sport est multi-sélection : aucun
sport n'est exclu par défaut, puis un ou plusieurs sports peuvent être cochés.
La soirée inclut aussi un programme commencé avant 20 h s'il se termine après
20 h. Chaque diffusion affiche son heure de début et de fin. La vue principale
conserve au maximum deux événements par compétition et au maximum la valeur de
`--limit`. Attribuer ensuite un seul verdict par événement :

XMLTVFr omet souvent le marqueur direct. Un `Direct probable` repose donc sur
des indices de grille et reste à contrôler. `À confirmer` sert à évaluer le
rappel : vérifier un petit échantillon de cette vue permet de repérer les vrais
directs que l'algorithme conservateur aurait manqués.

```text
OK
Doute
Hors sujet
Mauvaise chaîne
Mauvais horaire
Mauvais Live/Différé
Doublon
```

Le commentaire par ligne et le champ global « événement majeur manquant »
sont facultatifs. Toutes les modifications sont automatiquement enregistrées
dans `reports/validation-poc2-tonight-<source>-<date>.json`. Le fichier POC-1
`validation-tonight-<source>-<date>.json` est conservé comme référence.

Pour contrôler les faux négatifs, renseigner seulement le champ global si un
événement important est absent. Une fois la soirée validée, ce fichier suffit
pour lancer l'analyse des résultats et ajuster le classement.

Le CSV détaillé décrit ci-dessous reste disponible pour une investigation
technique ciblée ; il n'est plus le parcours de validation par défaut.

### Référence externe L'Équipe

La page [Programme TV sport de L'Équipe](https://www.lequipe.fr/programme-tv/agenda)
est pertinente comme benchmark manuel : elle couvre plusieurs chaînes et
permet notamment de distinguer les directs et les émissions.

Elle ne doit pas être collectée automatiquement ni réutilisée comme source de
données du produit sans autorisation écrite préalable. Les CGU de L'Équipe
s'opposent explicitement à l'extraction, la réutilisation et la collecte
automatisée de leurs contenus. Pour le POC, l'usage retenu est donc :

```text
autorisé dans le projet : consultation humaine et saisie de nos seuls verdicts
exclu sans accord       : scraper, stocker ou republier leur grille
option future           : demander une licence, un partenariat ou une API
```

## 1. Préparer les données

Pour chaque source et chaque journée retenue :

```bash
npm run xmltv:fetch -- --source=xmltvfr
npm run xmltv:day -- --source=xmltvfr --date=YYYY-MM-DD
npm run xmltv:export-csv -- --source=xmltvfr --date=YYYY-MM-DD
npm run xmltv:export-csv -- --source=xmltvfr --date=YYYY-MM-DD --with-sportsdb
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

## 2. Annoter le CSV détaillé

L'export contient 100 candidats sportifs et 50 non-candidats. Les lignes sont
triées dans l'ordre `Sport Live`, `Sport différé`, puis `Emission`, et ensuite
par horaire et chaîne.

Les colonnes préfixées par `auto` et `contentCategory` sont des propositions
automatiques, pas la vérité terrain :

| Colonne | Rôle |
|---|---|
| `contentCategory` | catégorie proposée parmi `Sport Live`, `Sport différé`, `Emission` |
| `autoIsSport` | classification proposée : `true`, `false` ou `unknown` |
| `autoConfidence` | confiance de la proposition : `high`, `medium` ou `low` |
| `autoReason` | règle ayant conduit à la proposition |
| `autoSport` | sport déduit du signal XMLTV |
| `autoCompetition` | compétition extraite lorsqu'elle est explicitement nommée |
| `autoParticipants` | équipes/joueurs extraits lorsqu'ils sont explicitement séparés par `/`, `vs` ou `contre` |
| `autoIsLive` | direct/différé proposé à partir du titre/description et, avec `--with-sportsdb`, du matching horaire/statut |
| `checkRequired` | `true` si une vérification humaine est recommandée |
| `checkReason` | raison de la vérification à effectuer |
| `sportsDbEventId` | événement TheSportsDB associé, si le matching est suffisamment solide |
| `sportsDbEvent` | nom de l'événement TheSportsDB associé |
| `sportsDbCompetition` | compétition telle que fournie par TheSportsDB |
| `sportsDbParticipants` | participants tels que fournis par TheSportsDB |
| `sportsDbStartAt` | horaire TheSportsDB utilisé comme indice de comparaison |
| `sportsDbTimeDeltaMinutes` | écart indicatif entre l'horaire XMLTV et TheSportsDB |
| `sportsDbMatchConfidence` | confiance du matching : `high`, `medium`, `low` ou `none` |
| `sportsDbLiveEvidence` | indice utilisé pour le direct : alignement horaire, statut API, titre explicite, etc. |

La seule validation manuelle obligatoire porte sur les colonnes sans préfixe
`auto` ci-dessous. Les propositions peuvent être corrigées, mais ne doivent
pas remplacer la valeur vérifiée.

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

Pour aller vite, filtrer d'abord `checkRequired=true`, puis vérifier les
lignes `checkRequired=false` à haute confiance. Les colonnes `channelCorrect`,
`timeCorrect`, `referenceUrl` et `referenceStartAt` nécessitent toujours une
source officielle : elles ne sont pas déduites automatiquement de façon
fiable.

Avec `--with-sportsdb`, considérer `sportsDbMatchConfidence=high` et
`sportsDbLiveEvidence=aligned-event-start` comme un indice de « probablement
live », jamais comme une vérité. Une rediffusion peut reprendre le même
événement et les horaires TheSportsDB peuvent être exprimés dans la timezone
locale de l'événement. Vérifier les cas non ambigus avec le diffuseur.

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

Les trois catégories servent à organiser le guide :

```text
Sport Live     = événement sportif avec indication explicite de direct/live
Sport différé  = événement sportif sans direct explicite, replay ou rediffusion
Emission       = programme non sportif ou contenu éditorial sportif
```

Un `unknown` ou une confiance `medium`/`low` déclenche `checkRequired=true`.

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
est un taux de matching et une qualité d'enrichissement. Le champ de statut
TheSportsDB peut signaler un événement en cours, mais les statuts ne sont pas
uniformes pour tous les sports : `sportsDbLiveEvidence` doit donc rester une
preuve à contrôler.

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
