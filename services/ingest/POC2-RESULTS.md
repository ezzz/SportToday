# POC-2 — résultats du filtrage produit

Date de référence : 20 août 2026  
Source testée : XMLTVFr  
Vérité terrain : validation manuelle POC-1

## Point de départ

La vue POC-1 « Direct / à confirmer » contenait 64 événements validés :

```text
OK                         19
Mauvais Live / Différé     28
Hors sujet                 15
Mauvais horaire             1
Doute                       1
```

La couverture brute était intéressante, mais le mélange entre direct,
rediffusion et statut inconnu rendait la vue principale trop bruitée.

## Règles introduites

- quatre statuts distincts : `confirmed`, `probable`, `unknown`, `delayed` ;
- les rediffusions détectées ne sont plus promues dans `Direct` ;
- une journée de compétition antérieure présente dans la même grille est
  classée en différé, la journée la plus récente restant un direct probable ;
- plusieurs créneaux non superposés du même événement sur la même chaîne
  empêchent sa promotion automatique en direct ;
- `PereNoel.fr` et les écrans génériques `Ligue 1+ 2` à `Ligue 1+ 9` sont mis
  en quarantaine ;
- le filtre soirée retient un événement qui chevauche 20 h, grâce à l'heure
  de fin, et affiche la plage horaire complète ;
- la sélection principale affiche au maximum deux événements par compétition ;
- les sports `FootVolley` et `Motonautisme` ne sont plus assimilés au football
  ou à la Formule 1 ;
- les intitulés génériques sont signalés et les participants Serbie / France
  ont été extraits de la description du match amical de basket.

## Mesure sur la vue par défaut

La nouvelle vue `Direct + Soirée` contient quatre événements après
diversification :

```text
20:00–22:00  Basket-ball — Serbie / France
20:38–22:38  Ligue 3 — Caen / Aubagne
20:38–22:40  Ligue 3 — Concarneau / Villefranche Beaujolais
22:52–00:58  Golf — Open de St. Louis
```

Les quatre avaient reçu le verdict `OK` pendant POC-1. Aucun des 28 cas
signalés `Mauvais Live / Différé` ne remonte dans cette vue.

Cette mesure valide la précision sur cet échantillon, pas encore le rappel :
des directs réels peuvent rester dans `À confirmer` lorsque XMLTVFr ne fournit
pas assez d'indices.

## Prochaine validation attendue

Lancer POC-2 sur plusieurs dates, puis contrôler en priorité :

1. les quelques cartes de `Direct + Soirée` ;
2. les événements importants absents via le champ global ;
3. un petit échantillon de `À confirmer` pour mesurer les directs manqués ;
4. l'exactitude des chaînes et des plages horaires.

Une seconde source ne sera ajoutée qu'après cette mesure. Elle devra surtout
améliorer le rappel des directs et la fraîcheur des chaînes, sans dégrader la
précision obtenue ici.
