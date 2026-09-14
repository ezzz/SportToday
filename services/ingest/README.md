# SportToday MVP1

SportToday répond à une question simple : **quel sport intéressant puis-je regarder maintenant, ce soir ou demain, sur les diffuseurs auxquels j’ai accès ?**

Le service croise un catalogue d’événements sportifs avec la grille TV XMLTVFr. La vue principale est orientée événements ; l’Agenda TV reste disponible comme contrôle secondaire.

Le périmètre produit, les sources retenues et les critères de sortie sont centralisés dans [MVP1-PLAN.md](./MVP1-PLAN.md). La préparation du serveur privé est décrite dans [DEPLOYMENT-PRIVEE.md](./DEPLOYMENT-PRIVEE.md).

## Démarrage local

Prérequis : Node.js 22.5 ou supérieur.

```bash
cd services/ingest
cp .env.example .env
# Renseigner au minimum API_FOOTBALL_KEY dans .env
npm ci
npm start
```

Ouvrir <http://127.0.0.1:4173>. Le serveur prépare aujourd’hui, demain et un aperçu synthétique jusqu’au dimanche suivant, puis actualise automatiquement ses données. `Ctrl+C` l’arrête.

Pour rendre le site accessible sur le Wi-Fi local :

```bash
npm start -- --host=0.0.0.0
```

Ouvrir ensuite `http://ADRESSE-IP-DU-PC:4173` depuis le téléphone. Ne pas exposer ce port directement sur Internet.

## Variables d’environnement

Le fichier `.env` ne doit jamais être committé. La même clé API-Sports est utilisée par défaut pour Football, Volleyball, Basketball et Rugby :

```dotenv
API_FOOTBALL_KEY=...
API_VOLLEYBALL_KEY=
API_BASKETBALL_KEY=
API_RUGBY_KEY=
ESPN_TENNIS_ENABLED=true
ESPN_GOLF_ENABLED=true
MOTOGP_ENABLED=true
SPORTTODAY_TIMEZONE=Europe/Paris
```

Les trois clés spécialisées peuvent rester vides si elles sont identiques à `API_FOOTBALL_KEY`.

## Commandes utiles

```bash
npm run typecheck
npm test
npm run mvp:report -- --source=xmltvfr
npm run mvp:web -- --source=xmltvfr
npm run mvp:web -- --source=xmltvfr --date=2026-09-12 --refresh-events
npm run mvp:coverage -- --source=xmltvfr
```

Les anciennes commandes `poc4:*` restent temporairement acceptées pour ne pas casser les installations existantes, mais ne doivent plus être utilisées dans les nouveaux guides.

## Docker

```bash
cd services/ingest
cp .env.example .env
# Renseigner API_FOOTBALL_KEY
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:4173/healthz
docker compose logs -f --tail=100 sporttoday
```

Les données persistantes sont dans `runtime/`. Une reconstruction de l’image ne les supprime pas.

## Windows sur le réseau local

Depuis la racine du dépôt, dans PowerShell :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-poc4-windows.ps1 -Install -AllowFirewall
```

Le nom du script est conservé pour compatibilité. Il lance désormais la cible MVP1. Pour surveiller la branche et redémarrer automatiquement après un pull :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\watch-poc4-windows.ps1 -Install -AllowFirewall
```

## Fonctionnement et diagnostic

- Aujourd’hui ouvre `Maintenant` : événements en cours ou dans les trois prochaines heures.
- Demain ouvre la journée entière.
- Un aperçu compact prolonge la sélection jusqu’au week-end ; pour la F1 et le MotoGP, il privilégie la course principale.
- `Ma sélection` masque les sports exclus et filtre par bouquets ; sans bouquet choisi, les diffuseurs français connus sont proposés.
- `Tout voir` ignore temporairement ces préférences.
- Une compétition peut être masquée depuis le détail d’un événement. Les notes d’intérêt de 1 à 5 par sport et compétition personnalisent les événements retenus dans `À ne pas manquer`, dont l’affichage reste chronologique.
- Les événements terminés sont grisés et ne sont plus retenus dans `À ne pas manquer`.
- Vert = direct déclaré ou horaire TV aligné ; jaune = information partielle, multiplex ou droits sans chaîne précise ; rouge = rediffusion.
- Les détails repliés expliquent la provenance de chaque diffusion.

Le healthcheck renvoie le dernier état d’actualisation :

```bash
curl http://127.0.0.1:4173/healthz
```

En cas d’échec temporaire d’un fournisseur, le service conserve le dernier cache exploitable, affiche l’avertissement dans le panneau de qualité et passe le healthcheck en `degraded`. Les commentaires de validation restent stockés dans `reports/`.

Le forfait gratuit API-Sports ne donne accès qu’à aujourd’hui et demain : Football, Volley, Basket et Rugby ne sont donc pas interrogés à partir de J+2. L’aperçu de fin de semaine utilise les sources à horizon plus long (F1, MotoGP, ESPN/EPG, athlétisme et cyclisme) sans consommer inutilement le quota API-Sports.

Le champ `Commentaire général / debug` du panneau Qualité est sauvegardé sur le serveur. Tous les retours peuvent être téléchargés depuis le bouton prévu à cet effet ou directement via :

```bash
curl -o sporttoday-feedback.json http://127.0.0.1:4173/feedback.json
```
