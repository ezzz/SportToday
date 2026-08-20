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
diffusions similaires et classe les principaux événements. L'interface démarre
sur `Direct / à confirmer + Soirée dès 20 h`, puis permet de basculer vers `Différé`,
`Émission` ou la journée complète. Chaque combinaison est limitée aux 12
meilleurs résultats par défaut. Sur le programme du `2026-08-17`, la première
sélection faisait notamment ressortir :

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
