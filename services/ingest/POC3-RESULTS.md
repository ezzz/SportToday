# POC-3 — premiers résultats du matching TheSportsDB

Date d'exécution : 21 août 2026  
Source EPG : XMLTVFr  
API sportive : TheSportsDB v1 gratuite, clé publique `123`

## Pourquoi le premier test ne trouvait rien

Le premier POC utilisait principalement `eventsday.php`. La documentation
TheSportsDB indique que cet endpoint ne renvoie que 3 événements avec l'offre
gratuite, contre 1 500 en Premium. Les quelques résultats de la requête
globale n'avaient donc aucune raison de contenir les matchs français visibles
dans XMLTVFr.

Créer un compte gratuit ne change pas cette limite et ne fournit pas de clé
plus complète : tous les utilisateurs gratuits emploient `123`. Le compte
devient utile lors d'un passage Premium, car la clé privée apparaît alors dans
le profil.

Sources officielles :

- <https://www.thesportsdb.com/docs_api_guide>
- <https://www.thesportsdb.com/pricing>
- <https://www.thesportsdb.com/docs_terms_of_use.php>

## Stratégie testée sans abonnement

POC-3 interroge maintenant `searchevents.php` pour chaque affiche Football
extraite de XMLTVFr, puis `lookuptv.php` uniquement lorsqu'un événement est
retrouvé. La recherche gratuite retourne un événement ciblé, ce qui suffit
pour vérifier les deux équipes, la date et l'horaire.

Le panel est plafonné à 8 affiches. Avec au plus deux recherches de variantes
et un lookup TV par affiche, il reste sous la limite gratuite de 30
requêtes/minute.

Commande :

```bash
npm run sportsdb:poc3 -- --source=xmltvfr --date=2026-08-21 --limit=8
```

## Résultat réel

```text
Affiches Football testées                    8
Correspondances fortes                       3
Correspondances moyennes                     0
Sans correspondance                          5
Créneaux proposés direct probable             6
Créneaux proposés différé probable            2
Événements avec diffuseur français retourné   1
```

Correspondances :

| XMLTVFr | TheSportsDB | Écart observé | Conclusion POC |
|---|---|---:|---|
| Marseille / Strasbourg, 19 h 45 | début 20 h 45 | -60 min | avant-match + direct probable |
| Marseille / Strasbourg, 23 h 15 | début 20 h 45 | +150 min | différé probable |
| Arsenal / Coventry City, 21 h | début 21 h | 0 min | direct probable |
| Arsenal / Coventry City, 23 h 39 | début 21 h | +159 min | différé, déjà marqué par XMLTV |
| Boulogne-sur-Mer / Red Star, 19 h 53 | début 20 h | -7 min | direct probable |

Les cinq autres affiches n'ont pas été trouvées à cette date : Lens /
Paris-SG, Everton / Lille, Toulouse / Hambourg, Newcastle / Strasbourg et Lyon
/ Aston Villa. Plusieurs ressemblent à des rediffusions de matchs antérieurs,
mais l'absence TheSportsDB n'est pas une preuve suffisante. Elles restent donc
`unknown`.

TheSportsDB a retourné `Ligue 1+ 1 FR` pour Marseille / Strasbourg. Pour
Arsenal, la limite gratuite de deux diffuseurs a renvoyé le Royaume-Uni et
l'Inde, pas la France. Le lookup Boulogne / Red Star ne contenait aucun
diffuseur. Le Premium pourrait améliorer cette partie en passant de 2 à 100
diffuseurs retournés, sans garantir que les données françaises existent.

## Conclusion sur les 9 $

L'abonnement n'est pas nécessaire pour poursuivre le POC. La recherche
ciblée gratuite démontre déjà que le matching apporte un signal utile et
permet de corriger des créneaux importants.

Le mois Premium devient pertinent seulement si les tests multi-dates
confirment simultanément :

1. une bonne précision des matchs retrouvés ;
2. un manque de couverture causé par les limites de retour, et non par des
   événements absents de la base ;
3. une vraie valeur des diffuseurs français ou de l'API v2.

Pour une utilisation publique en production, les conditions TheSportsDB
demandent de passer sur une offre payante et d'attribuer la source. La clé
gratuite convient au développement du POC.

## Alternatives sportives à garder en secours

| Source | Offre d'essai | Intérêt | Limite principale |
|---|---|---|---|
| API-Sports / API-Football | compte gratuit, 100 requêtes/jour | Football très large, fixtures et horaires | Football seulement pour notre besoin immédiat ; compte requis |
| football-data.org | gratuit, 12 compétitions, 10 appels/min | fixtures des grandes compétitions | horaires et scores différés dans l'offre gratuite |
| Sportmonks | 2 ligues gratuites, essai payant 14 jours | données professionnelles et bonnes entités | couverture gratuite trop étroite ; plans à partir de 29 € |

Sources officielles :

- <https://api-sports.io/sports/football>
- <https://www.football-data.org/pricing>
- <https://www.sportmonks.com/football-api/>

API-Football est le meilleur plan B gratuit si TheSportsDB reste trop
incomplet sur le Football. Il ne remplacera toutefois pas une source
multisports.

## Autres pistes pour les programmes TV

| Source | Avis pour SportToday |
|---|---|
| XMLTVFr | reste la meilleure base POC actuelle ; couverture large, mais direct/replay parfois incomplet |
| TvProfil | piste commerciale sérieuse : XMLTV/JSON, France, plus de 1 200 chaînes ; tarif sur devis |
| Gracenote On API | référence industrielle avec grilles, mises à jour et entités sportives ; probablement surdimensionnée et coûteuse pour le MVP |
| Schedules Direct | France annoncée en SD-JSON, mais les conditions interdisent la redistribution et l'affichage public/commercial |
| EPG.best | test de qualité possible, mais les conditions standard sont personnelles et la republication publique nécessite un accord écrit adapté |
| pages de diffuseurs | utiles comme benchmark manuel ; collecte automatisée à traiter diffuseur par diffuseur avec autorisation |

Sources officielles :

- <https://tvprofil.com/bg/epg/>
- <https://documentation.gracenote.com/on-api/index.html>
- <https://schedulesdirect.org/regions>
- <https://schedulesdirect.org/signup>
- <https://epg.best/terms-of-use>

La piste EPG recommandée en parallèle n'est donc pas un autre flux gratuit
d'origine incertaine : c'est de demander un devis et un échantillon France à
TvProfil, sans engagement, pour comparer la qualité et clarifier la licence.

