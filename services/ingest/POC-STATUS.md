# POC DATA — premiers résultats locaux

Date d'exécution : 17 août 2026

Ces résultats sont des smoke tests techniques, pas encore le rapport final
DATA-18. Les snapshots bruts et la base SQLite restent exclus de Git.

## XMLTVFr

Flux testé : `https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz`

```text
Chaînes                  402
Programmes               116 375
Programmes détectés sport 16 612
Sans titre               0
Sans description         20 984
Horizon                  8,39 jours
```

Le flux est téléchargeable et le parsing fonctionne. Les chiffres devront
être confirmés sur la durée et comparés au panel de chaînes et aux sources
officielles.

Filtrage de la journée `2026-08-17` en `Europe/Paris` :

```text
Programmes commençant ce jour       11 945
Candidats sportifs                   327
Principaux signaux                   football=171, tennis=47, cyclisme=32
```

Le résultat confirme que le contenu est exploitable pour une inspection
manuelle, mais les 327 candidats doivent encore être annotés pour mesurer la
précision et le rappel du classifieur.

Sur l'échantillon CSV de 150 lignes, la nouvelle analyse automatique propose :

```text
true / confiance haute       43
true / confiance moyenne      5
false / confiance haute      46
unknown / confiance basse    26
false / confiance moyenne    30
checkRequired=true          104
checkRequired=false          46
Sport Live                    0
Sport différé                69
Emission                     81
```

Les lignes sont désormais triées par catégorie : `Sport Live`, `Sport
différé`, puis `Emission`. Les colonnes automatiques proposent aussi le sport,
la compétition, les participants et le statut direct/différé lorsqu'ils sont
explicitement déductibles. `Foot 2 rue` est proposé `Emission` / `false` avec
une confiance haute car ses catégories sont `Dessin animé|Jeunesse`. La valeur
manuelle `isSport` reste vide jusqu'à ta validation.

## Sélection produit « aujourd’hui / ce soir »

Le rapport couvre désormais toute la journée jusqu'à 00 h 30, regroupe les
diffusions similaires et classe les principaux événements. Depuis POC-2,
l'interface démarre sur `Direct + à confirmer` en soirée : les informations
incomplètes restent visibles sans être séparées du direct. Le filtre soirée
utilise la plage début-fin : un événement déjà
commencé mais encore en cours à 20 h est conservé.

Les chaînes obsolètes ou génériques identifiées sont mises en quarantaine et
la sélection est limitée à deux cartes par compétition pour éviter qu'une
seule journée de championnat occupe toute la vue. Les résultats détaillés et
la mesure sur la validation du 20 août sont conservés dans
[`POC2-RESULTS.md`](./POC2-RESULTS.md).

POC-2.1 exploite maintenant `<previously-shown/>` et `<sub-title>`, sépare les
tours/sessions/jours et qualifie chaque créneau indépendamment. Le rejeu du 21
août et les limites restantes sont détaillés dans
[`POC21-RESULTS.md`](./POC21-RESULTS.md). Après validation utilisateur, la
prochaine étape conservée est le matching ciblé XMLTVFr ↔ TheSportsDB décrit
dans [`POC3-PLAN.md`](./POC3-PLAN.md).

La première passe POC-3 gratuite retrouve désormais 3 affiches Football sur 8
et produit des écarts horaires exploitables, notamment pour distinguer
l'avant-match et la rediffusion de Marseille / Strasbourg. Le détail et les
alternatives DATA sont dans [`POC3-RESULTS.md`](./POC3-RESULTS.md).

## POC-4 — synthèse orientée événements

Le retour produit confirme que la grille directement issue de XMLTV mélange
trop de matchs et donne une mauvaise synthèse, en particulier pour le football.
Le cadrage POC-4 est désormais documenté dans
[`POC4-PLAN.md`](./POC4-PLAN.md).

La prochaine vue principale partira d'une watchlist de compétitions et
d'événements prioritaires, puis rattachera les diffusions XMLTV. La vue
programme TV actuelle sera conservée en vue secondaire. Le périmètre initial
est limité au Football, Tennis, F1 et Golf.

La verticale F1 de POC-4.1 est fonctionnelle sur le 23 août 2026 : la course
du Grand Prix des Pays-Bas est récupérée à 15 h depuis Jolpica et rattachée aux
créneaux Canal+ de 15 h dans XMLTVFr. Les programmes d'avant-course et la
rediffusion ultérieure sont écartés des diffusions directes retenues.

La verticale Football est maintenant testée avec la clé API-Football réelle.
Sur le `2026-08-24`, le catalogue retourne 5 matchs suivis : 1 Premier League,
2 de La Liga et 2 de Serie A. XMLTVFr rattache les 2 diffusions de Fulham /
Chelsea ; les 4 autres événements restent visibles et signalés comme sans
diffusion. La vue principale les regroupe par compétition afin de contrôler la
complétude sans multiplier les modes de validation.

Le site POC4 prépare également trois dates au démarrage — aujourd'hui, demain
et après-demain — avec un fichier de validation JSON distinct par date. La
procédure de déploiement sur un PC Windows du réseau domestique est décrite
dans [`WINDOWS-LAN.md`](./WINDOWS-LAN.md).

Sur le programme du `2026-08-17`, la première sélection POC-1 faisait notamment
ressortir :

```text
Lens / Paris-SG — Trophée des Champions
Crystal Palace / Arsenal
Masters 1000 de Cincinnati
Championnat du Portugal
Grand Prix de Lima
La Vuelta
WTA de Cincinnati
EFL Championship
```

La validation se fait dans une interface locale avec un seul verdict par
événement. Les annotations sont sauvegardées en JSON et exportables en CSV
compatible Excel ou en XLSX. L'analyse finale reste en attente de la
validation utilisateur.

La page multi-chaînes [Programme TV sport de L'Équipe](https://www.lequipe.fr/programme-tv/agenda)
est retenue comme benchmark manuel de qualité. Elle n'est pas intégrée comme
source : ses CGU interdisent explicitement la collecte et la réutilisation
automatisées sans autorisation écrite préalable.

## XMLTVFREE

Flux testé : `http://xmltvfree.free.fr/xmltv.xml.gz`

```text
Chaînes                  26
Programmes               6 184
Programmes détectés sport 428
Sans titre               0
Sans description         3 530
Horizon                  0 jour
```

Observation bloquante : les premiers programmes du fichier sont datés du
`2006-03-05` dans le flux téléchargé, alors que la collecte a été effectuée
le `2026-08-17`. Le flux est donc considéré comme stale / non exploitable
pour le moment, jusqu'à confirmation d'une URL ou d'une version à jour.

Le flux répond en HTTP et aucune information sensible ne doit lui être
envoyée.

## TheSportsDB

L'appel gratuit `eventsday.php` avec la clé publique `123` fonctionne. L'export
CSV accepte désormais `--with-sportsdb` et ajoute les colonnes de matching et
de preuve live/non-live.

Sur la journée `2026-08-17`, les requêtes générique + sports détectés ont
retourné 9 événements (baseball, football argentin et basketball mexicain) et
aucun des 150 programmes de l'échantillon XMLTVFr ne correspondait. Ce résultat ne
permet pas de conclure à une absence de qualité : l'endpoint gratuit ne couvre
pas nécessairement les compétitions françaises présentes dans l'EPG. Il faut
mesurer séparément le taux de matching sur un panel d'événements connus.

Un matching haute confiance avec horaire aligné peut proposer `autoIsLive=true`,
mais cette proposition reste à vérifier. TheSportsDB enrichit et rapproche les
événements ; il ne remplace pas la preuve de diffusion du diffuseur.

## Conséquence actuelle

```text
XMLTVFr      → candidat techniquement exploitable, à mesurer dans le temps
XMLTVFREE    → candidat actuellement bloqué par la fraîcheur observée
TheSportsDB  → enrichissement + matching indicatif, couverture à mesurer
EPG.best     → différé
```
