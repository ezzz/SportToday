# Utiliser SportToday depuis un téléphone sur le Wi-Fi local

Le script prévu pour un PC Windows est [`scripts/run-poc4-windows.ps1`](../../scripts/run-poc4-windows.ps1). Il installe les dépendances, récupère automatiquement XMLTVFr au premier lancement si la base SQLite n'existe pas, compile le site, prépare les trois dates (aujourd'hui, demain et après-demain) et écoute sur le réseau local. XMLTVFr est utilisé par défaut ; XMLTVFREE peut être demandé avec `-Source xmltvfree` pour un test séparé.

## Installation initiale

1. Installer Node.js LTS 22.5 ou supérieur sur le PC Windows : <https://nodejs.org/>.
2. Récupérer le dépôt, idéalement sur la branche POC :

   ```powershell
   git clone https://github.com/ezzz/SportToday.git
   cd SportToday
   git switch --track -c poc/data-sources origin/poc/data-sources
   ```

   Si `git switch` répond que `origin/poc/data-sources` n'existe pas, la branche
   n'a pas encore été publiée depuis le poste de développement. Depuis ce poste,
   publier d'abord la branche :

   ```bash
   git add services/ingest scripts sport-tv-web-plan.md
   git commit -m "feat: complete POC4 local validation site"
   git push -u origin poc/data-sources
   ```

   Puis supprimer le dossier Windows incomplet et refaire le `git clone`.

3. Ouvrir `services\ingest\.env`. S'il n'existe pas encore, le script créera une copie de `.env.example` au premier lancement. Renseigner au minimum `API_FOOTBALL_KEY` avec la clé API-Football personnelle. Cette clé active aussi API-Volleyball par défaut. `API_TENNIS_KEY` est facultative (compte séparé) ; Golf et Diamond League utilisent leurs connecteurs POC publics optionnels. Les clés restent sur le PC et ne sont jamais affichées par le site.
4. Dans PowerShell, depuis la racine du dépôt :

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\scripts\run-poc4-windows.ps1 -Install -AllowFirewall
   ```

   Si PowerShell indique que `.env` vient d'être créé, compléter la clé puis relancer exactement la même commande.

`-AllowFirewall` ajoute une règle entrante uniquement au profil réseau **Privé**. Si le PC n'est pas administrateur, autoriser manuellement le port TCP `4173` lorsque Windows le demande, ou relancer PowerShell en administrateur.

Pour actualiser XMLTV à chaque relance, ajouter `-FetchEpg` :

```powershell
.\scripts\run-poc4-windows.ps1 -FetchEpg -AllowFirewall
```

## Utilisation depuis le téléphone

Le script affiche une adresse du type `http://192.168.1.25:4173`. Connecter le téléphone au même Wi-Fi, ouvrir cette adresse dans son navigateur, puis choisir la date souhaitée dans le bouton **Aujourd'hui / Demain / Après-demain**.

Les validations et commentaires sont enregistrés séparément par date dans `services\ingest\reports\`. Pour arrêter le site, revenir à la fenêtre PowerShell et faire `Ctrl+C`.

## Relances et mises à jour

Après une mise à jour du dépôt :

```powershell
git pull
.\scripts\run-poc4-windows.ps1 -Install -AllowFirewall
```

Pour rejouer une date précise pendant un test :

```powershell
.\scripts\run-poc4-windows.ps1 -Date 2026-08-24 -AllowFirewall
```

Le serveur est destiné à un réseau domestique privé. Ne pas ouvrir le port sur un profil **Public**, ne pas le rediriger sur Internet et ne pas placer la clé API dans un fichier commité.
