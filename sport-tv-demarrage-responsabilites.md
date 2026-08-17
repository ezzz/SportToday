# Sport TV Web — Démarrage et responsabilités

Ce document précise les actions à réaliser côté porteur du projet et celles qui peuvent être prises en charge côté développement.

## Décision d'ordre

Le **step 2 — POC XMLTV** doit démarrer en premier, car la disponibilité et la qualité des données constituent le risque principal du produit.

Le step 1 peut avancer pendant la période de collecte du POC. Le step 3 ne doit commencer pleinement qu'après la décision `DATA-11 — Go / No-Go XMLTV`.

---

# Step 2 — POC XMLTV

## 2.0 Identifier une source de données exploitable

### À faire côté porteur du projet

- identifier la source de données à tester ;
- obtenir un accès d'essai, un abonnement ou un fichier représentatif ;
- récupérer sa documentation et son catalogue de chaînes ;
- vérifier les droits de stockage, transformation et affichage commercial ;
- vérifier la fréquence de mise à jour, l'horizon et les limites de téléchargement.

Questions à poser à un éventuel fournisseur :

```text
1. Le flux couvre-t-il la France ?
2. Quelles chaînes Canal+, beIN Sports, Eurosport, DAZN et TNT sont incluses ?
3. Les événements OTT sont-ils inclus ou seulement les chaînes linéaires ?
4. Quelle est la fréquence de mise à jour ?
5. Quel est l'horizon disponible ?
6. Le flux contient-il les catégories, le direct et le replay ?
7. Peut-on stocker et transformer les données ?
8. Peut-on afficher publiquement les programmes sur un service commercial ?
9. Existe-t-il une période d'essai ou un fichier exemple ?
10. Quelles sont les limites de téléchargement ?
```

Éléments à fournir pour démarrer :

- nom et URL publique de la source ;
- documentation ;
- liste des chaînes annoncées ;
- fichier XMLTV d'exemple, si disponible.

Les identifiants, tokens et URL signées ne doivent pas être enregistrés dans la documentation ou dans Git. Ils seront placés dans un fichier `.env` local ignoré par Git.

### Clarification sur le projet `XMLTV/xmltv`

Le dépôt <https://github.com/XMLTV/xmltv> est une suite d'outils open source permettant de récupérer, produire, valider et transformer des programmes TV au format XMLTV.

Il faut distinguer :

```text
XMLTV                      = format de fichier + outils
Source ou fournisseur EPG = organisme ou service qui fournit les programmes
```

Ce dépôt ne constitue donc pas, à lui seul, un fournisseur COTS de données françaises. Il contient historiquement un grabber `tv_grab_fr`, mais celui-ci a été désactivé dans la version 1.4.0 du 17 avril 2025 en raison des conditions d'utilisation de sa source amont.

Le dépôt pourra éventuellement servir pour la validation du format ou certains utilitaires, mais il ne résout pas l'accès légal et durable aux programmes TV français.

## 2.1 Valider le périmètre

### À faire côté porteur du projet

Confirmer le panel de diffuseurs :

```text
Chaînes gratuites
Canal+
Eurosport
beIN Sports
DAZN
RMC Sport
Prime Video
Max
YouTube / FIFA+
```

Décider si le POC évalue uniquement les chaînes linéaires ou la promesse produit complète incluant les événements OTT.

### Recommandation

Mesurer séparément :

```text
Couverture TV linéaire
Couverture OTT
Couverture totale du besoin utilisateur
```

## 2.2 Valider le protocole

Proposition par défaut :

```text
Durée d'observation : 14 jours consécutifs
Téléchargement : toutes les 60 minutes, sous réserve des limites de la source
Panel : toutes les chaînes ciblées disponibles
Sports : les 10 sports définis dans le plan
Échantillon de référence : au moins 200 événements
Fuseau métier : Europe/Paris
Stockage technique : UTC
```

### À faire côté porteur du projet

- approuver ou modifier ces paramètres ;
- valider les sources officielles utilisées comme références ;
- signaler les événements connus ayant subi un changement tardif.

## 2.3 Valider les seuils Go / No-Go

Proposition initiale :

```text
Couverture des événements sportifs linéaires ≥ 95 %
Horaires corrects à ±5 minutes             ≥ 98 %
Horizon disponible                         ≥ 5 jours
Changements intégrés en moins de 2 heures  dans 95 % des cas
Sport correctement identifié               ≥ 90 %
Direct correctement identifié              ≥ 90 %
```

La couverture OTT doit être évaluée séparément. Le replay est mesuré à titre informatif et ne doit pas bloquer le MVP.

### À faire côté porteur du projet

Valider que ces seuils correspondent à la qualité attendue pour le produit.

## 2.4 Développer le POC

### Pris en charge côté développement

- initialisation du dépôt Git ;
- création de `services/ingest` ;
- téléchargement sécurisé ;
- archivage horodaté des fichiers bruts ;
- empreinte et contrôle d'intégrité des snapshots ;
- parsing XMLTV ;
- stockage SQLite ;
- tests automatisés ;
- génération des rapports.

### À faire côté porteur du projet

Renseigner localement les accès à la source dans le fichier de configuration sécurisé qui sera préparé.

## 2.5 Collecter les données

### À faire côté porteur du projet

- maintenir la machine ou le serveur de collecte actif pendant environ 14 jours ;
- signaler les reports, annulations et changements connus ;
- contrôler manuellement un petit échantillon lorsque nécessaire.

Un VPS peut être utilisé pour fiabiliser cette collecte continue, mais il n'est pas nécessaire pour développer le premier prototype.

## 2.6 Décider — DATA-11

Le rapport final doit présenter :

- couverture par chaîne et par sport ;
- horizon ;
- fraîcheur ;
- erreurs d'horaires ;
- qualité de l'identification du direct ;
- différence entre couverture linéaire et OTT ;
- exemples d'erreurs ;
- recommandation argumentée.

### Décision côté porteur du projet

```text
GO         → XMLTV devient la source principale
GO PARTIEL → XMLTV complété par des sources spécifiques
NO-GO      → une autre source doit être recherchée
```

---

# Step 1 — Infrastructure minimale

Cette étape peut avancer pendant la collecte du POC.

## À faire côté porteur du projet

- choisir le nom du produit ;
- acheter le domaine `.fr` ;
- créer ou choisir le compte et le repository GitHub ;
- acheter un VPS Ubuntu 24.04 ;
- ajouter une clé SSH au VPS ;
- choisir l'adresse e-mail administrative.

Informations non secrètes nécessaires au développement :

```text
Nom du domaine
Nom du repository GitHub
Adresse IP du VPS
Nom de l'utilisateur de déploiement
```

## Pris en charge côté développement

- structure du monorepo ;
- bootstrap Ansible ;
- Docker Compose ;
- Caddy et HTTPS ;
- page temporaire ;
- CI GitHub Actions ;
- déploiement automatique ;
- health check.

Les secrets SSH et GitHub doivent être saisis directement dans GitHub ou sur la machine concernée.

---

# Step 3 — MVP

Cette étape commence pleinement après la décision DATA-11.

## À faire côté porteur du projet

- valider le nom et l'identité visuelle minimale ;
- sélectionner les sports et diffuseurs prioritaires ;
- valider les quatre filtres du MVP ;
- définir précisément « Maintenant » et « Ce soir » ;
- décider de la présence de liens vers les diffuseurs ;
- vérifier les droits d'utilisation des logos ;
- préparer ou valider les mentions légales et la politique de confidentialité.

## Pris en charge côté développement

- PostgreSQL et migrations ;
- ingestion normalisée ;
- API ;
- pages Aujourd'hui, Maintenant, Ce soir et Demain ;
- filtres ;
- interface mobile ;
- SEO technique ;
- tests et déploiement.

---

# Prochaines actions

1. Identifier une source française concrète et juridiquement exploitable.
2. Obtenir sa documentation ou un échantillon de données.
3. Valider le protocole de 14 jours et les seuils proposés.
4. Initialiser ensuite DATA-01 à DATA-04.
