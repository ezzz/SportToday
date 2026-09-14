# Déploiement privé de SportToday MVP1

Ce guide prépare la bêta privée mono-utilisateur. La cible recommandée est un petit VPS **Ubuntu 24.04 LTS**, Docker Compose et Tailscale. Le port applicatif 4173 ne doit pas être exposé sur Internet.

## Architecture cible

```text
Téléphone / Mac ── réseau privé Tailscale ── VPS
                                             └─ Docker Compose
                                                └─ SportToday :4173
```

Tailscale fournit l’accès privé entre les appareils autorisés. Aucun domaine n’est nécessaire pour la première bêta. Un domaine et un reverse proxy HTTPS public ne seront étudiés qu’après validation du fonctionnement continu.

## À préparer côté utilisateur

- un VPS avec Ubuntu 24.04 LTS, 1 vCPU, 2 Go de RAM et environ 20 Go de disque ;
- un compte administrateur distinct de `root`, avec clé SSH ;
- un compte Tailscale ;
- le dépôt Git accessible depuis le VPS ;
- la clé API-Sports, conservée hors de Git ;
- idéalement une copie locale des sauvegardes du serveur.

Dans le pare-feu du fournisseur, seul SSH doit être ouvert pendant l’installation. Restreindre si possible SSH à l’adresse IP personnelle. Ne pas ouvrir 4173, 80 ou 443 pour cette étape.

## Préparation du VPS

Après connexion SSH :

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
```

Installer Docker Engine et le plugin Compose depuis le dépôt officiel Docker pour Ubuntu, puis vérifier :

```bash
docker --version
docker compose version
```

Ajouter l’utilisateur courant au groupe Docker seulement si l’on accepte qu’il dispose de privilèges équivalents à `root` :

```bash
sudo usermod -aG docker "$USER"
```

Se déconnecter puis se reconnecter après cette commande.

## Première installation SportToday

```bash
git clone https://github.com/ezzz/SportToday.git
cd SportToday/services/ingest
cp .env.example .env
mkdir -p runtime/data runtime/reports runtime/backups
```

Éditer `.env` et renseigner au minimum :

```dotenv
API_FOOTBALL_KEY=VOTRE_CLE
SPORTTODAY_TIMEZONE=Europe/Paris
```

La même clé est utilisée automatiquement pour les API-Sports Football, Volleyball, Basketball et Rugby.

Construire et démarrer :

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:4173/healthz
docker compose logs -f --tail=100 sporttoday
```

Compose lie volontairement le service à `127.0.0.1`. Tant que Tailscale n’est pas configuré, le site est donc joignable uniquement depuis le VPS lui-même.

## Accès privé Tailscale

Installer Tailscale sur le VPS, le téléphone et le Mac depuis les instructions officielles. Une fois les appareils rattachés au même compte, deux options restent sûres :

1. conserver SportToday sur `127.0.0.1` et utiliser `tailscale serve` comme proxy privé ;
2. lier Compose uniquement à l’adresse Tailscale du VPS via `SPORTTODAY_BIND_ADDRESS`.

La première option est recommandée car elle évite d’altérer la configuration Docker. La commande exacte sera fixée lors de l’accès au VPS, après vérification de la version de Tailscale et du nom DNS privé attribué à la machine.

Contrôles indispensables avant utilisation :

- le site répond depuis le téléphone connecté à Tailscale ;
- il ne répond pas depuis un appareil non connecté ;
- aucun port 4173/80/443 n’est ouvert dans le pare-feu public ;
- `/healthz` ne contient aucun secret.

## Mise à jour contrôlée

Installer uniquement une version explicitement validée :

```bash
cd SportToday
git pull --ff-only
cd services/ingest
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:4173/healthz
```

Le dossier `runtime/` est monté en volume : base SQLite, caches, rapports et validations survivent à la reconstruction de l’image.

## Sauvegarde et restauration

Créer une sauvegarde cohérente :

```bash
cd SportToday/services/ingest
./scripts/backup.sh
ls -la runtime/backups
```

Copier régulièrement le dernier dossier de sauvegarde hors du VPS.

Pour restaurer :

```bash
docker compose stop sporttoday
./scripts/restore.sh runtime/backups/sporttoday-YYYYMMDDhhmmss
docker compose up -d
curl http://127.0.0.1:4173/healthz
```

Le script conserve les données remplacées sous un nom `.before-restore-*`. Ne pas les supprimer avant d’avoir contrôlé les validations.

## Exploitation courante

```bash
docker compose ps
docker compose logs --tail=200 sporttoday
curl http://127.0.0.1:4173/healthz
docker compose restart sporttoday
```

Un statut `degraded` signifie que le dernier rapport reste servi mais qu’une actualisation a échoué. Vérifier `lastRefreshError` et les logs avant toute relance. Ne jamais copier `.env` dans un ticket, un commit ou une capture d’écran.

## Validation avant fin de bêta privée

- démarrage automatique après redémarrage du VPS ;
- actualisation aujourd’hui/demain pendant sept jours ;
- au moins une sauvegarde restaurée sur une instance de test ;
- consommation disque et rotation des logs vérifiées ;
- accès Tailscale révoqué et réautorisé sur un appareil test ;
- aucune clé API présente dans l’image, les logs ou Git.
