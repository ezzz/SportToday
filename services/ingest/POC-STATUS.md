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

Sur l'échantillon CSV de 150 lignes, l'analyse automatique propose :

```text
true / confiance haute       46
false / confiance haute      44
unknown / confiance basse    30
false / confiance moyenne    30
```

Exemple corrigé automatiquement : `Foot 2 rue` est proposé `false` car ses
catégories sont `Dessin animé|Jeunesse`. La valeur manuelle `isSport` reste
vide jusqu'à ta validation.

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

L'appel gratuit `eventsday.php` avec la clé publique `123` fonctionne pour le
test d'adaptateur. Le matching avec les programmes XMLTV n'est pas encore
implémenté.

## Conséquence actuelle

```text
XMLTVFr      → candidat techniquement exploitable, à mesurer dans le temps
XMLTVFREE    → candidat actuellement bloqué par la fraîcheur observée
TheSportsDB  → enrichissement sportif, adaptateur validé
EPG.best     → différé
```
