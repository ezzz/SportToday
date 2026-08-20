# Sport TV Web — Plan de lancement

> Dernière mise à jour : 20 août 2026 — filtres Direct/Soirée et date courante opérationnels

## Objectif

Créer un site web inspiré du principe de **FootAO**, mais généralisé à l'ensemble des sports et des diffuseurs disponibles en France.

La proposition de valeur initiale est simple :

> **Quel sport puis-je regarder aujourd'hui / ce soir, où, et à quelle heure ?**

Le projet est organisé en trois workstreams, qui peuvent être réalisés partiellement en parallèle :

1. Mise en place de l'infrastructure du site web
2. POC pour évaluer la source COTS XMLTV
3. Mise en place du MVP du site

---

# Architecture cible initiale

L'objectif est de rester volontairement simple au démarrage :

- 1 VPS
- Docker Compose
- Next.js / TypeScript
- PostgreSQL
- Caddy pour le reverse proxy et HTTPS
- GitHub
- GitHub Actions pour CI/CD
- Pas de Kubernetes
- Pas de microservices

```text
                ┌─────────────────────┐
                │    XMLTV France     │
                │ + futures sources   │
                └──────────┬──────────┘
                           │
                       Ingestion
                           │
                           ▼
                   ┌──────────────┐
                   │ PostgreSQL   │
                   └──────┬───────┘
                          │
                          ▼
Internet ──► Caddy ──► Next.js
             HTTPS        │
                          └─ Web + API
```

Côté livraison :

```text
Developer
   │
   ▼
 GitHub
   │
   ├── Pull Request → lint + tests + build
   │
   └── merge main
          │
          ▼
   GitHub Actions
          │
     build Docker
          │
          ▼
        GHCR
          │
          ▼
     SSH vers VPS
          │
          ▼
docker compose pull
docker compose up -d
```

---

# 1. Mise en place de l'infrastructure

## Objectif de sortie

À la fin de cette étape :

```text
https://monsite.fr
```

doit afficher une page mock du type :

> **Le sport à regarder aujourd'hui — Coming soon**

Un merge sur `main` doit automatiquement redéployer le site.

---

## 1.1 Nom de domaine

Prendre directement un domaine `.fr`, puisque le service cible en priorité les programmes accessibles en France.

Un registrar classique comme OVH est suffisant.

Configuration minimale :

- achat du domaine ;
- configuration DNS ;
- enregistrement A vers l'IP du VPS ;
- éventuellement `www` en CNAME ;
- pas besoin de Cloudflare au démarrage.

HTTPS sera géré automatiquement par Caddy.

---

## 1.2 VPS

Configuration recommandée pour commencer :

- Hetzner Cloud ou fournisseur VPS équivalent ;
- 2 vCPU ;
- 4 Go RAM ;
- 40 Go SSD minimum ;
- architecture x86_64 ;
- Ubuntu 24.04 LTS.

Cette configuration est suffisante pour :

```text
Caddy
Next.js
PostgreSQL
ingestion XMLTV
```

Le coût cible est de quelques euros par mois.

---

## 1.3 Initialisation du serveur

Installer/configurer au minimum :

```text
Ubuntu 24.04 LTS
SSH par clé uniquement
utilisateur dédié "deploy"
firewall
  22 SSH
  80 HTTP
  443 HTTPS

Docker Engine
Docker Compose plugin
Git
```

Prévoir dès le départ un bootstrap Ansible très simple :

```text
infra/
└── ansible/
    ├── inventory.yml
    └── setup-server.yml
```

Le playbook doit idéalement :

```text
create deploy user
install Docker
install Docker Compose
configure firewall
create /opt/sporttv
install SSH keys
```

### Choix d'architecture

- **Ansible : oui**
- **Terraform : non pour le moment**

Terraform pourra être ajouté plus tard si l'infrastructure devient plus importante.

---

## 1.4 Repository GitHub

Créer un seul repository / monorepo.

Structure proposée :

```text
sporttv/
│
├── apps/
│   └── web/
│
├── services/
│   └── ingest/
│
├── infra/
│   └── ansible/
│
├── deploy/
│   ├── docker-compose.yml
│   └── Caddyfile
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
└── README.md
```

Technologies :

```text
apps/web
  Next.js
  TypeScript

services/ingest
  POC / ingestion XMLTV

deploy
  web
  caddy
  postgres
```

---

## 1.5 CI

Sur chaque Pull Request :

```text
npm ci
npm run lint
npm test
npm run build
docker build
```

Objectif :

- empêcher le merge si le projet ne compile plus ;
- vérifier le lint ;
- lancer les tests ;
- valider que l'image Docker peut être construite.

Pas besoin d'une chaîne CI complexe au démarrage.

---

## 1.6 CD

Déclenchement :

```text
push → main
```

Workflow cible :

```text
1. build image
2. tag avec SHA Git
3. push ghcr.io/<owner>/sporttv:<sha>
4. SSH vers VPS
5. docker compose pull
6. docker compose up -d
7. health check
```

Secrets GitHub nécessaires :

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
```

Puis, lorsque PostgreSQL sera ajouté :

```text
DATABASE_PASSWORD
```

---

## 1.7 Health check

Prévoir dès le départ :

```http
GET /api/health
```

Réponse :

```json
{
  "status": "ok"
}
```

Le workflow CD peut appeler ce endpoint après déploiement pour vérifier que le nouveau container fonctionne.

---

## Gate INFRA

Ne pas continuer à complexifier l'infrastructure dès que les conditions suivantes sont remplies :

```text
✓ domaine configuré
✓ HTTPS fonctionnel
✓ page mock accessible
✓ Docker / Docker Compose
✓ CI fonctionnelle
✓ déploiement automatique sur main
✓ reboot du VPS → site redémarre automatiquement
```

---

# 2. POC DATA — comparaison des 3 sources retenues

## Objectif

Répondre à la question :

> **Peut-on construire SportToday avec une source gratuite ou quasi gratuite, suffisamment complète pour le MVP, sans dépendre d'un fournisseur EPG enterprise ?**

Le POC DATA initial doit comparer les trois sources retenues :

```text
A. XMLTVFr
B. XMLTVFREE
C. TheSportsDB

EPG.best est explicitement différé. Il pourra être ajouté dans un second
benchmark si les deux flux XMLTV gratuits ne couvrent pas suffisamment le
besoin ou si leurs conditions de réutilisation posent problème.
```

Le but n'est pas nécessairement de choisir une source unique. Une architecture hybride peut être plus pertinente :

```text
EPG / XMLTV
    │
    │ horaires + chaîne + titre
    ▼
Programmes sportifs candidats
    │
    ├───────────────┐
    │               │
    ▼               ▼
TheSportsDB     règles internes
    │               │
    ├ sport          ├ live / replay
    ├ compétition    ├ normalisation
    ├ participants   └ classification
    └ eventId
    │
    └───────┬───────┘
            ▼
      SportToday DB
```

Hypothèse privilégiée :

> **Une source EPG bon marché pour savoir ce qui passe et quand + une source sportive structurée pour enrichir les événements.**

---

## 2.1 Accès / comptes nécessaires

### XMLTVFr

```text
Compte requis : NON
API key : NON
Accès : URL de fichier XML/XML compressé publique
Coût POC : 0 €
```

Pour le POC :

```text
→ aucun compte à créer
→ télécharger directement le flux France
→ privilégier .gz ou .xz plutôt que le XML non compressé
```

Page des flux : https://xmltvfr.fr/xmltv.php
Flux France retenu pour le POC : https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz

### XMLTVFREE

```text
Compte requis : NON
API key : NON
Accès : fichier XMLTV public
Coût POC : 0 €
```

Pour le POC :

```text
→ aucun compte à créer
→ télécharger directement le fichier XMLTV public
```

Page de référence : https://xmltvfree.free.fr/
Flux annoncé : http://xmltvfree.free.fr/xmltv.xml.gz
Point à documenter : le flux public est actuellement exposé en HTTP.

### EPG.best — différé

EPG.best n'est pas inclus dans le POC initial. Aucun compte ne doit être créé
à ce stade. Il pourra être réévalué ultérieurement comme candidat commercial
si XMLTVFr et XMLTVFREE ne suffisent pas.

### TheSportsDB

```text
Compte requis pour premier test : NON
Clé V1 gratuite : 123
Compte Premium : OUI si on veut tester sérieusement la couverture TV
Premium : 9 $ / mois
```

La V1 gratuite peut être appelée directement :

```text
https://www.thesportsdb.com/api/v1/json/123/...
```

Limite importante pour le benchmark TV :

```text
Schedule TV
Free limit    : 1
Premium limit : 1500
```

Le free tier suffit donc pour :

```text
✓ valider le format JSON
✓ coder l'adaptateur
✓ tester quelques lookups
✓ valider le matching EPG ↔ événement sportif
```

mais pas pour mesurer sérieusement l'exhaustivité d'une journée complète.

Plan recommandé :

```text
Étape 1
→ tester gratuitement avec la clé publique 123

Étape 2
→ si l'intégration semble intéressante,
   prendre 1 mois Premium à 9 $
   pour le benchmark réel
```

La V2 nécessite Premium et utilise `X-API-KEY`.

Sources :
- https://www.thesportsdb.com/docs_api_guide
- https://www.thesportsdb.com/free_sports_api
- https://www.thesportsdb.com/docs_terms_of_use.php

---

## 2.2 Candidat A — XMLTVFr

### Rôle envisagé

```text
référence de couverture France
+
source EPG potentielle
```

### Points forts

```text
✓ gratuit
✓ XMLTV natif
✓ environ 402 chaînes accessibles depuis la France
✓ flux complet plus large disponible
✓ programme jusqu'à 5 jours
✓ chaînes gratuites et payantes
✓ simple à intégrer
```

### Risques

```text
? droits de réutilisation commerciale des données
? dépendance à plusieurs sources amont
? OTT non garanti
? live / replay pas nécessairement structuré
```

### Usage dans le POC

```text
POC technique          → OUI
benchmark couverture   → OUI
production commerciale → uniquement après clarification juridique
```

---

## 2.3 Candidat B — XMLTVFREE

### Rôle envisagé

```text
candidat 0 €
+
alternative/fallback à XMLTVFr
```

### Points forts

```text
✓ gratuit
✓ XMLTV natif
✓ mise à jour quotidienne annoncée
✓ sept jours de programmes annoncés
✓ accès direct sans compte
```

### Points critiques à vérifier

```text
? couverture réelle aujourd'hui
? nombre de chaînes
? Canal+
? Canal+ Sport / Foot
? beIN Sports
? Eurosport
? DAZN
? chaînes événementielles
? fraîcheur réelle
```

Le POC doit répondre rapidement :

```text
XMLTVFREE couvre-t-il suffisamment
le bouquet sportif français
pour être une source principale ?
```

Sinon : source secondaire / fallback.

### Première observation locale

Lors du smoke test du 17 août 2026, le flux téléchargé répondait mais ses
premiers programmes étaient datés du 5 mars 2006. XMLTVFREE reste dans le
benchmark pour vérification, mais il est considéré comme non exploitable tant
qu'une URL ou une version à jour n'est pas confirmée.

---

## 2.4 Candidat différé — EPG.best

### Statut

Ce candidat est conservé dans le plan comme piste de repli, mais est hors du
benchmark initial. Il sera étudié uniquement après l'analyse de XMLTVFr,
XMLTVFREE et TheSportsDB.

### Points forts

```text
✓ prix très faible
✓ France disponible
✓ beaucoup de chaînes
✓ XML / JSON selon l'offre
✓ sélection du lineup utile
✓ free trial
```

### Points à vérifier

```text
? couverture exacte France
? Canal+
? Canal+ Sport
? Canal+ Foot
? Canal+ Sport 360
? Eurosport 1/2
? Eurosport 360
? beIN Sports
? beIN MAX
? DAZN
? fréquence de mise à jour
? horizon
? usage sur un site web public
```

Risque principal : disponibilité technique du feed ≠ autorisation de republier publiquement les programmes sur SportToday.

---

## 2.5 Enrichissement sportif — TheSportsDB

### Rôle envisagé

TheSportsDB n'est pas un EPG généraliste. Son principal intérêt pour SportToday est l'enrichissement sportif, la normalisation et le matching événement.

Il expose notamment :

```text
sports
leagues / competitions
events
teams
participants
TV broadcasts
TV schedule
```

### Points forts

```text
✓ API JSON
✓ premier test gratuit
✓ sport natif
✓ compétition native
✓ événements structurés
✓ participants structurés
✓ informations TV associées aux événements
```

### Risques

```text
? couverture France probablement incomplète
? données crowdsourcées
? free tier trop limité pour un benchmark exhaustif TV
? ne remplace probablement pas une source EPG
```

### Usage privilégié

```text
EPG
 │
 ▼
"Arsenal - Liverpool"
20:45
Canal+ Foot
 │
 ▼
TheSportsDB
 │
 ├ Premier League
 ├ Arsenal
 ├ Liverpool
 ├ eventId
 └ métadonnées sportives
```

---

## 2.6 Adaptateurs de sources

Créer une abstraction unique :

```text
services/ingest/
│
├── sources/
│   ├── xmltvfr.ts
│   ├── xmltvfree.ts
│   └── thesportsdb.ts
│
├── normalize/
│   ├── channels.ts
│   ├── sports.ts
│   ├── programmes.ts
│   └── matching.ts
│
└── reports/
```

Interface conceptuelle :

```text
DataSource
  fetch()
  parse()
  normalize()
```

> **XMLTV doit être un format d'entrée, pas le modèle métier SportToday.**

---

## 2.7 Stockage POC

SQLite est suffisant.

Tables proposées :

```text
source_snapshot
source_channel
source_programme
normalized_channel
normalized_programme
sport_event
event_match
```

Chaque objet importé doit conserver :

```text
source
sourceId
fetchedAt
rawPayloadReference
```

---

## 2.8 Archiver les snapshots

```text
data/
  xmltvfr/
    2026-08-17-0800.xml.gz
    2026-08-17-1200.xml.gz

  xmltvfree/
    2026-08-17-0800.xml.gz

  thesportsdb/
    2026-08-17-tv-france.json
```

Objectif : mesurer les différences entre deux collectes successives.

---

## 2.9 Panel de chaînes

Tester au minimum :

```text
France 2
France 3
France 4
France 5
L'Équipe

Canal+
Canal+ Sport
Canal+ Foot
Canal+ Sport 360

Eurosport 1
Eurosport 2
Eurosport 360

beIN Sports 1
beIN Sports 2
beIN Sports 3
beIN Sports MAX

DAZN 1
RMC Sport
Golf+
```

Ajouter les généralistes diffusant ponctuellement du sport :

```text
TF1
M6
TMC
W9
```

---

## 2.10 Panel de sports

```text
Football
Rugby
Tennis
Cyclisme
F1
MotoGP
Basket
Athlétisme
Golf
Sports d'hiver
Handball
Volley
```

---

## 2.11 Rapport automatique par fournisseur

| Critère | XMLTVFr | XMLTVFREE | TheSportsDB |
|---|---:|---:|---:|---:|
| Coût POC | 0 | 0 | 0 puis éventuellement Premium |
| Compte nécessaire | non | non | non en free |
| France | à mesurer | à mesurer | à mesurer |
| Chaînes payantes | à mesurer | à mesurer | partiel probable |
| Horizon | à mesurer | à mesurer | à mesurer |
| Fraîcheur | à mesurer | à mesurer | à mesurer |
| Titre | à mesurer | à mesurer | structuré |
| Description | à mesurer | à mesurer | variable |
| Sport | à déduire | à déduire | natif |
| Compétition | à déduire | à déduire | natif |
| Participants | à déduire | à déduire | natif |
| Live | variable | variable | à mesurer |
| Replay | variable | variable | à mesurer |
| OTT | à mesurer | à mesurer | à mesurer |
| Licence site public | à clarifier | à clarifier | paid recommandé |

---

## 2.12 Métriques quantitatives

Pour chaque source mesurer :

```text
nombre total de chaînes
nombre de chaînes du panel présentes
nombre de programmes par jour
nombre de programmes sportifs
nombre de programmes sans titre
nombre de programmes sans description
nombre de trous dans les grilles
horizon maximum
```

Calculer :

```text
channelCoverage =
  chaînes du panel présentes
  /
  chaînes du panel attendues
```

Puis sur une journée de référence :

```text
sportCoverage =
  événements sportifs attendus
  /
  événements sportifs récupérés
```

---

## 2.13 Fraîcheur

Collecter idéalement plusieurs fois par jour :

```text
08:00
12:00
18:00
22:00
```

Comparer :

```text
programme ajouté
programme supprimé
horaire modifié
chaîne modifiée
titre modifié
description modifiée
```

Tester spécialement les changements tardifs, annulations, retards et changements de chaîne.

---

## 2.14 Ground truth du POC

Comparer manuellement quelques journées avec les sources officielles :

```text
DAZN
Canal+
Eurosport
beIN
France TV
L'Équipe
```

Ces sites servent uniquement de référence de contrôle et non de source destinée à être scrapée en production.

---

## 2.15 Détection des programmes sportifs

Pour les sources EPG :

```text
programme
    │
    ├ catégorie
    ├ titre
    ├ description
    ├ chaîne
    └ matching TheSportsDB
```

Classification initiale :

```text
SPORT_CONFIRMED
SPORT_PROBABLE
NOT_SPORT
UNKNOWN
```

---

## 2.16 Matching TheSportsDB

Construire un score basé sur :

```text
date
horaire
sport
compétition
participants
titre
chaîne
```

Stocker :

```text
matchedEventId
matchConfidence
```

Ne pas exiger un matching parfait pour le MVP.

---

## 2.17 Couverture OTT

Distinguer impérativement :

```text
LINEAR
```

de :

```text
OTT_ONLY
```

Tester explicitement :

```text
DAZN
Canal+
Eurosport / Max
Prime Video
YouTube
FIFA+
```

Le rapport doit contenir :

```text
LINEAR_COVERAGE
OTT_COVERAGE
```

---

## 2.18 Vérification juridique

Pour chaque source documenter :

```text
URL des conditions
licence
usage personnel
usage commercial
stockage autorisé
affichage public autorisé
redistribution brute autorisée / interdite
attribution requise
```

Règle :

```text
licence du logiciel
        ≠
licence des données
```

---

## 2.19 Scénarios de sortie du POC

### Scénario A — idéal

```text
XMLTVFr ou XMLTVFREE
        │
        │ bonne couverture + licence compatible
        ▼
source EPG principale
        │
        +
        ▼
TheSportsDB
enrichissement
```

Coût DATA cible :

```text
0 à ~10 €/mois
```

### Scénario B — hybride communautaire

```text
XMLTVFr
   +
XMLTVFREE
   +
TheSportsDB
```

Possible techniquement, publication uniquement après clarification des droits de réutilisation.

### Scénario C — EPG seul suffisant

Si une source XMLTV contient une catégorisation sport correcte, une bonne description, du live/replay exploitable et une excellente couverture, TheSportsDB peut rester optionnel.

### Scénario D — aucun candidat suffisamment exhaustif

Avant de passer à un fournisseur enterprise, tester :

```text
combinaison de plusieurs feeds
+
source manuelle pour quelques événements OTT
+
enrichissement sportif
```

---

## Gate DATA

Le milestone devient :

> **DATA-20 — choix de la stratégie DATA MVP**

Critères :

```text
1. couverture des chaînes
2. couverture des événements sportifs
3. fraîcheur
4. qualité des horaires
5. couverture OTT
6. facilité d'intégration
7. coût
8. droits de publication
```

Décision attendue :

```text
SOURCE EPG PRINCIPALE
+
SOURCE(S) SECONDAIRE(S)
+
SOURCE D'ENRICHISSEMENT
+
COÛT DATA MVP
+
RISQUES RÉSIDUELS
```
### Axes prioritaires de validation

Le POC doit produire des mesures séparées pour chaque source, et ne pas se
limiter au nombre total de programmes téléchargés.

| Axe | Mesure attendue |
|---|---|
| Disponibilité | succès HTTP, durée, taille, checksum, erreurs consécutives |
| Couverture chaînes | présence des chaînes du panel et taux de grilles non vides |
| Couverture sportive | événements sportifs de référence présents par chaîne et par sport |
| Classification | précision et rappel sur un échantillon annoté manuellement |
| Qualité sémantique | titre, description, compétition, participants, catégorie |
| Horaires | écart à la source officielle, fuseau et passage été/hiver |
| Fraîcheur | délai d'apparition d'un ajout, report, annulation ou changement de chaîne |
| Horizon | jours réellement disponibles à chaque collecte |
| Déduplication | doublons entre chaînes événementielles et programmes répétés |
| Enrichissement | taux de matching XMLTV → TheSportsDB et qualité des correspondances |
| OTT | événements disponibles hors chaînes linéaires |
| Juridique | droit de stockage, transformation et affichage public |

### Validation manuelle recommandée

Le parcours principal valide directement la promesse « quel sport regarder ce
soir ? ». Pour chaque soirée testée :

```text
10 à 15 événements principaux proposés automatiquement
un verdict unique par événement : OK, Doute ou raison d'erreur
un champ global facultatif pour signaler un événement majeur absent
contrôle prioritaire du titre, de la chaîne, de l'horaire et du Live/Différé
```

Le premier passage couvre au minimum une soirée en semaine et une soirée de
week-end. La validation détaillée de 100 candidats sportifs et 50
non-candidats reste disponible uniquement pour diagnostiquer un défaut précis
du classifieur.

Les verdicts du parcours produit sont sauvegardés en JSON et exportables en
CSV/XLSX. Les annotations détaillées suivantes ne sont demandées que sur les
lignes en erreur :

```text
isSport
sport
competition
participants
isLive
channelCorrect
timeCorrect
```

Les seuils de départ proposés sont :

```text
couverture chaînes du panel       ≥ 95 %
rappel des événements sportifs    ≥ 90 %
précision des candidats sportifs  ≥ 90 %
horaires à ±5 minutes              ≥ 98 %
fraîcheur des changements          ≤ 2 heures au percentile 95
```

Ces seuils doivent être appliqués séparément aux chaînes linéaires et aux
offres OTT. TheSportsDB ne doit pas être noté comme une source EPG : il est
évalué sur le taux et la qualité de son enrichissement.

# 3. MVP du site

## Objectif

Répondre immédiatement à :

> **Quel sport puis-je regarder aujourd'hui ?**

Le MVP doit privilégier la lisibilité et la rapidité plutôt qu'une grille TV exhaustive complexe.

---

## 3.1 Exemple de page principale

```text
SPORT À LA TV AUJOURD'HUI

[ Maintenant ] [ Ce soir ] [ Demain ]


🔥 En direct

17:30  🚴 Cyclisme
Tour de Pologne — Étape 4
Eurosport 1
● DIRECT


À venir

19:00 ⚽ Football
...
DAZN

20:30 🏉 Rugby
...
Canal+ Sport
```

---

## 3.2 Filtres MVP

Limiter initialement à quatre filtres :

```text
Sport
Horaire
Diffuseur
Direct / tout
```

Exemple :

```text
Sport
[ Tous ▼ ]

Horaire
[ Maintenant ] [ Ce soir ] [ Toute la journée ]

Diffuseur
[ Tous ] [ Canal+ ] [ Eurosport ] [ DAZN ] ...

☑ Direct uniquement
```

---

## 3.3 Pages principales

### `/`

Programme du jour.

### `/ce-soir`

Page importante pour le besoin utilisateur et le SEO :

> Programme TV sport ce soir

### `/demain`

Programme du lendemain.

---

## 3.4 Pages par sport

Exemples :

```text
/sport/football
/sport/tennis
/sport/cyclisme
/sport/rugby
/sport/f1
```

---

## 3.5 Pages par chaîne

Exemples :

```text
/chaine/eurosport-1
/chaine/canal-plus-sport
/chaine/dazn
```

Ces pages peuvent être intéressantes pour le SEO.

---

# 3.6 Modèle de données MVP

## Channel

```text
id
name
logo
provider
isFree
```

## Programme

```text
id
source
sourceId
channelId

title
description

startAt
endAt

sport
competition

liveStatus

createdAt
updatedAt
```

Valeurs proposées pour `liveStatus` :

```text
UNKNOWN
LIVE
DELAYED
REPLAY
```

## Provider

Exemples :

```text
FRANCE_TV
CANAL
EUROSPORT
DAZN
BEIN
RMC
LEQUIPE
```

Il faut distinguer dès le départ :

```text
channel = Eurosport 1
provider = Eurosport
```

car l'utilisateur raisonnera probablement davantage en abonnement fournisseur :

> J'ai Eurosport.

qu'en chaîne individuelle.

---

# 3.7 Ingestion production

Sur le VPS :

```text
systemd timer / cron
        │
toutes les 30 minutes
        │
        ▼
docker compose run --rm ingest
        │
        ▼
fetch
normalize
upsert PostgreSQL
```

Pas besoin au démarrage de :

```text
Kafka
RabbitMQ
Kubernetes CronJobs
scheduler distribué
```

---

# 3.8 Fonctionnalités à ne PAS mettre dans le MVP

Éviter de construire trop tôt :

```text
❌ comptes utilisateurs
❌ login
❌ application iOS
❌ notifications
❌ recommandations IA
❌ score d'intérêt
❌ favoris synchronisés
❌ commentaires
❌ statistiques sportives
❌ résultats sportifs live
❌ Kubernetes
❌ microservices
```

Une sélection locale des abonnements peut éventuellement être enregistrée simplement en :

```text
localStorage
```

sans compte utilisateur.

---

# 3.9 Analytics

Ajouter des analytics simples dès le MVP.

Événements intéressants :

```text
visite /ce-soir
filtre sport
filtre chaîne
filtre direct
clic sur événement
clic "où regarder"
```

Objectif :

comprendre si l'utilisateur cherche principalement :

```text
"ce soir"
```

ou :

```text
"football"
```

ou :

```text
"Eurosport"
```

ou une autre façon de naviguer.

Ces données guideront la V2.

---

# Ordre de réalisation

Les trois streams peuvent se chevaucher.

```text
                 ┌─── 1. INFRA ────────────────┐
                 │                              │
Départ ──────────┼─── 2. POC XMLTV ────────────┼────►
                 │                  │           │
                 │                  ▼           │
                 └────────────── 3. MVP ────────┘
```

---

# Phase A — Infra + POC en parallèle

## Infra

```text
VPS
domaine
GitHub
Docker
CI/CD
mock
```

## POC DATA

```text
XMLTVFr : téléchargement + parsing + couverture
XMLTVFREE : téléchargement + parsing + couverture
TheSportsDB : API free + matching, puis Premium si pertinent
snapshots
comparaison chaînes
comparaison sports
sélection « ce soir » classée
interface locale de validation en un clic
filtres Direct / Différé / Émission
filtres Soirée dès 20 h / journée complète
benchmark manuel L'Équipe, sans collecte automatisée
analyse fraîcheur
analyse OTT
rapport de décision
```

---

# Phase B — Passage au MVP

Lorsque XMLTV paraît suffisamment exploitable :

```text
PostgreSQL
      ↓
modèle normalisé
      ↓
ingestion
      ↓
API
      ↓
UI MVP
```

---

# Phase C — Site public

Fonctions :

```text
Aujourd'hui
Maintenant
Ce soir
Demain

+
sport
+
diffuseur
+
direct
```

---

# Backlog initial

## EPIC 1 — Infrastructure

```text
INFRA-01 Acheter domaine
INFRA-02 Acheter VPS
INFRA-03 Initialiser DNS
INFRA-04 Créer repo GitHub
INFRA-05 Ansible bootstrap VPS
INFRA-06 Docker Compose
INFRA-07 Caddy / HTTPS
INFRA-08 Page mock
INFRA-09 GitHub CI
INFRA-10 GitHub CD
```

### Definition of Done EPIC 1

```text
✓ site accessible publiquement
✓ HTTPS valide
✓ page mock fonctionnelle
✓ déploiement automatique depuis main
✓ redémarrage automatique après reboot VPS
```

---

## EPIC 2 — DATA Source Bake-off

```text
DATA-01 Intégrer XMLTVFr
DATA-02 Intégrer XMLTVFREE
DATA-03 Tester TheSportsDB avec clé free 123
DATA-04 Évaluer 1 mois Premium TheSportsDB si nécessaire
DATA-05 Normaliser les chaînes entre sources
DATA-06 Archiver les snapshots
DATA-07 Mesurer couverture chaînes
DATA-08 Mesurer couverture sports
DATA-09 Mesurer horizon
DATA-10 Mesurer fraîcheur
DATA-11 Mesurer trous / complétude
DATA-12 Tester classification sport
DATA-13 Tester live / replay
DATA-14 Tester matching TheSportsDB
DATA-15 Mesurer couverture OTT
DATA-16 Vérifier conditions de réutilisation
DATA-17 Comparer avec sources officielles
DATA-18 Valider la sélection produit « Direct + soirée » puis les vues secondaires
DATA-19 Consolider les anomalies et ajuster le classement
DATA-20 Choisir stratégie DATA MVP
```

### Definition of Done EPIC 2

Le rapport final doit permettre de décider :

```text
source EPG principale
+
source(s) secondaire(s)
+
source d'enrichissement
+
coût mensuel DATA MVP
+
couverture LINEAR
+
couverture OTT
+
risques juridiques résiduels
```

Objectif de coût initial :

```text
0 à ~10 €/mois si possible
```

## EPIC 3 — MVP

```text
MVP-01 Modèle PostgreSQL
MVP-02 Import XMLTV → PostgreSQL
MVP-03 Normalisation sports
MVP-04 Normalisation diffuseurs
MVP-05 API programmes
MVP-06 Page Aujourd'hui
MVP-07 Maintenant
MVP-08 Ce soir
MVP-09 Filtre sport
MVP-10 Filtre diffuseur
MVP-11 Direct uniquement
MVP-12 Pages par sport
MVP-13 Pages par chaîne
MVP-14 Responsive mobile
MVP-15 SEO
MVP-16 Analytics
```

---

# Priorités

## Priorité 1 — DATA

Le principal risque du projet n'est pas l'infrastructure.

La vraie inconnue est :

> **Peut-on construire automatiquement une liste exhaustive et suffisamment fraîche de ce que l'utilisateur peut regarder, notamment lorsqu'on sort des chaînes linéaires pour entrer dans DAZN, Eurosport, Canal+ et les plateformes OTT ?**

Le premier milestone produit réellement important est donc :

```text
DATA-20 — Choix de la stratégie DATA MVP
```

Le but n'est plus de faire un simple Go / No-Go XMLTV, mais de déterminer le meilleur assemblage entre XMLTVFr, XMLTVFREE et TheSportsDB. EPG.best reste une piste différée.

---

## Priorité 2 — Infra minimale

L'infrastructure doit uniquement permettre :

```text
git push
   ↓
CI
   ↓
image Docker
   ↓
déploiement VPS
   ↓
site disponible en HTTPS
```

Ne pas complexifier avant que le besoin apparaisse.

---

## Priorité 3 — MVP focalisé

Le MVP doit répondre au besoin principal :

> **Quel sport regarder aujourd'hui / maintenant / ce soir ?**

avec uniquement :

```text
date / plage horaire
sport
diffuseur
direct
```

Tout le reste pourra venir après validation de l'usage.

---

# Pistes post-MVP

Non prioritaires mais à garder en tête :

```text
comptes utilisateurs
abonnements personnels
favoris sports / équipes
notifications
application iOS
widgets iOS
Live Activities
score d'intérêt des événements
recommandations personnalisées
IA conversationnelle
résultats en direct
replay
liens directs vers diffuseurs
sources OTT spécifiques
```

Positionnement potentiel à terme :

> **Le JustWatch du sport en direct.**
