# POC-2.1 — qualification par créneau XMLTV

Date de référence : 21 août 2026  
Source rejouée : snapshot XMLTVFr collecté le 17 août 2026  
Vérité terrain : validation manuelle POC-2 du 21 août

## Objectif

POC-2 regroupait correctement les diffusions d'un événement, mais attribuait
un seul statut à toute la carte. Cela masquait les cas où un direct et ses
rediffusions figuraient dans plusieurs créneaux, notamment en Golf, F1 et
Judo.

POC-2.1 qualifie désormais chaque diffusion séparément avant de construire la
vue produit.

## Données XMLTV désormais exploitées

Le snapshot contient des informations que le premier parseur ignorait :

```text
Programmes                         116 375
Balises <previously-shown/>         16 807
Sous-titres <sub-title>             58 016
```

- `<previously-shown/>` est une preuve explicite de rediffusion ;
- `<sub-title>` permet de distinguer un tour, un jour ou une session alors que
  le titre principal est identique ;
- le statut, sa preuve, le sous-titre et les heures début-fin sont conservés
  pour chaque chaîne et chaque créneau.

## Résultat du rejeu du 21 août

Sur les candidats retenus par le filtre produit :

```text
Événements regroupés                41
Créneaux de diffusion              114
Directs confirmés                    0
Directs probables                    7
À confirmer                         64
Différés                             43
Différés portant le marqueur XMLTV   43
```

Les gains observés sur les retours utilisateur sont :

- Open de St. Louis : les trois créneaux du 1er tour sont en différé ; les
  deux créneaux du 2e tour à 21 h restent des directs probables ;
- Championnat d'Écosse : les deux créneaux du 1er tour sont en différé ; le
  2e tour à 13 h 30 reste probable ;
- Grand Prix de Lima : les cinq créneaux contrôlés sont en différé ;
- qualifications Sprint de F1 : les créneaux de 16 h sont probables et celui
  de 23 h 04 est en différé ;
- Arsenal / Coventry City : le créneau de 23 h 39 est en différé, séparément
  des créneaux de 21 h encore à confirmer ;
- les sessions F1, tours de Golf et jours de Judo ne sont plus fusionnés ;
- la chaîne technique `EvenementsSports4KUHD.fr`, contestée pendant la
  validation, est mise en quarantaine ;
- les variantes de titre Marseille / Strasbourg sont regroupées ;
- « après-match » est classé comme émission.

Le filtre de l'interface s'applique maintenant aux créneaux eux-mêmes. Une
carte mixte n'affiche donc que ses créneaux probables dans `Direct`, ses
créneaux explicitement rejoués dans `Différé`, et les autres dans `À
confirmer`.

## Limite restante

L'absence de `<previously-shown/>` ne prouve pas qu'une diffusion est en
direct. POC-2.1 reste volontairement conservateur : un créneau sans marqueur
et sans autre preuve demeure `À confirmer`.

Exemple : pour le Tour de l'Avenir, Eurosport est `probable`, tandis que le
créneau de La chaîne L'Équipe reste `unknown`. La validation humaine indique
que ce dernier est différé, mais XMLTVFr ne l'exprime pas. Les matchs de
football sans mention explicite restent également à confirmer malgré des
horaires qui paraissent compatibles.

Cette limite est précisément le périmètre du POC-3 décrit dans
[`POC3-PLAN.md`](./POC3-PLAN.md).

