# SportToday — plan consolidé MVP1

Dernière consolidation : 14 septembre 2026.

## 1. Cible produit à court terme

La promesse MVP1 est :

> En quelques secondes, trouver les rendez-vous sportifs qui m’intéressent aujourd’hui et demain, avec une diffusion adaptée à mes accès, puis anticiper les principaux temps forts jusqu’au week-end.

La première cible est une bêta privée mono-utilisateur. Elle doit être utile au quotidien sur téléphone avant toute ouverture publique. Le produit ne cherche pas à reproduire une grille TV exhaustive : sa valeur vient de la sélection, de la hiérarchie des événements et de la transparence sur la fiabilité des diffuseurs.

Le parcours principal est :

1. ouvrir le site et voir immédiatement ce qui est en cours ou commence dans les trois heures ;
2. basculer sur ce soir, toute la journée ou demain ;
3. limiter la sélection aux sports suivis et aux bouquets disponibles ;
4. comprendre d’un coup d’œil si la diffusion est certaine, probable, issue d’un multiplex ou seulement déduite de droits.

## 2. Périmètre MVP1

- Dates détaillées : aujourd’hui et demain, fuseau `Europe/Paris` ; aperçu synthétique des événements prioritaires jusqu’au dimanche suivant.
- Vues : `À voir` orientée événements et `Agenda TV` secondaire.
- Sports couverts : football, tennis, Formule 1, MotoGP, golf, rugby (Top 14 et Pro D2), basket (NBA, EuroLeague et compétition féminine suivie), volley, athlétisme et cyclisme sur route sélectionné.
- Football : principales compétitions diffusées en France ; la 2. Bundesliga et les compétitions secondaires non validables restent hors périmètre.
- Accès : bêta privée, aucune exposition directe du port Node sur Internet.

Hors périmètre MVP1 : application mobile native, comptes multi-utilisateurs, notifications, scores en direct complets, moteur éditorial automatisé, monétisation et publication publique.

## 3. Expérience retenue

### Itération courte 1 — choisir vite

État : implémentée, à valider en usage réel.

- `Maintenant` est la vue par défaut aujourd’hui et couvre le direct plus les trois prochaines heures.
- Demain s’ouvre sur la journée complète afin d’éviter une page vide liée à l’heure courante.
- La sélection de tête met en avant au plus cinq rendez-vous, avec diversité par sport et compétition.
- Le classement privilégie favoris, importance, finales, courses et horaires proches.
- Les notes d’intérêt de 1 à 5 par sport et compétition influencent la sélection, sans casser son ordre chronologique.
- Les événements terminés sont visuellement atténués et exclus de la sélection de tête.
- Les regroupements Sport puis Compétition sont triés par importance décroissante.
- Le motif de mise en avant est visible sans ouvrir les détails.

### Itération courte 2 — mes accès

État : implémentée, à valider en usage réel.

- Tous les sports sont visibles par défaut ; l’utilisateur masque ceux qu’il ne veut pas suivre.
- Les chaînes sont choisies par bouquet : gratuit français, Canal+, beIN Sports, DAZN/Ligue 1+, Eurosport, RMC Sport, autres diffuseurs français.
- Sans bouquet renseigné, la sélection conserve tous les diffuseurs français connus.
- `Ma sélection` applique les préférences ; `Tout voir` les contourne temporairement.
- Les préférences sont locales au navigateur et indépendantes des favoris.
- Les filtres ponctuels de sport se combinent aux préférences permanentes.
- Une compétition entière peut être masquée depuis le détail d’un événement puis réactivée dans les préférences.

### Itération courte 3 — confiance et continuité

État : implémentée, à valider en usage réel.

- Une carte composée uniquement de rediffusions n’apparaît plus dans le direct.
- Vert : direct déclaré dans la grille ou créneau TV aligné avec l’horaire sportif.
- Jaune : direct non confirmé, multiplex ou plateforme déduite d’une règle de droits sans chaîne exacte.
- Rouge : rediffusion.
- Le détail replié explique le statut de chaque diffuseur.
- L’heure de dernière génération est visible ; les erreurs de sources sont regroupées dans le panneau Qualité.
- Une erreur temporaire conserve les dernières données en cache et dégrade le healthcheck au lieu de vider silencieusement le site.
- Une collecte fournisseur ne peut pas bloquer une actualisation plus de 30 secondes ; un passage du scheduler pendant une actualisation est reporté et journalisé avec sa durée.
- Un commentaire général de debug est sauvegardé côté serveur pour chaque date et exportable via `/feedback.json`.

## 4. Sources retenues

| Besoin | Source actuelle | Statut MVP1 | Limite connue |
| --- | --- | --- | --- |
| Grille TV France | XMLTVFr | source EPG principale | intitulés parfois vagues, direct pas toujours explicite |
| Football | API-Football / API-Sports | retenue | quotas gratuits, périmètre volontairement filtré |
| Volley | API-Volleyball / API-Sports | retenue conditionnellement | diffuseur parfois absent de l’EPG |
| Basket | API-Basketball / API-Sports | retenue sur NBA, EuroLeague et événements sélectionnés | couverture à valider selon la saison |
| Rugby | API-Rugby / API-Sports | retenue sur Top 14 et Pro D2 | dépend du rattachement XMLTV |
| Tennis | scoreboard public ESPN + XMLTVFr | utile mais non contractuel | stabilité et conditions d’usage à surveiller |
| Golf | scoreboard public ESPN + XMLTVFr | utile mais non contractuel | détail variable selon les tournois |
| Formule 1 | Jolpica/Ergast | retenue | API communautaire |
| MotoGP | calendrier public MotoGP.com | retenue | endpoint public non contractuel |
| Athlétisme | World Athletics + calendrier Ultimate | retenue sur rendez-vous majeurs | certains horaires restent estimés |
| Cyclisme | calendriers UCI et organisateurs, dates intégrées | conditionnel | mise à jour annuelle manuelle, horaires issus de la TV |
| Droits France | règles datées et sourcées dans le code | complément seulement | ne prouve pas la chaîne ni le créneau exact |

Une seule clé API-Sports est réutilisée par défaut pour Football, Volleyball, Basketball et Rugby. `API_FOOTBALL_KEY` est donc la seule clé obligatoire aujourd’hui.

Le forfait gratuit de ces quatre produits limite les dates consultables à aujourd’hui et demain. Le service ne les appelle pas à partir de J+2 ; l’aperçu jusqu’au week-end est volontairement plus partiel et repose sur les sources à horizon plus long.

Sources écartées ou différées :

- XMLTVFREE : flux historique insuffisamment frais ; conservé uniquement pour compatibilité technique.
- TheSportsDB : matching trop faible pour le besoin principal ; conservé comme ancien outil de diagnostic.
- API-Tennis : abonnement trop coûteux pour le MVP.
- EPG.best : essai payant différé tant que XMLTVFr reste suffisant.
- L’Équipe et TV-Sports : benchmarks de contenu et d’UX, jamais sources de données sans accord ou licence explicite.

## 5. Règles de confiance

Trois concepts doivent rester séparés :

- l’heure officielle de l’événement sportif ;
- le créneau et la chaîne présents dans l’EPG ;
- une plateforme connue uniquement grâce aux droits de diffusion.

Une règle de droits peut rendre un événement utile, mais ne doit jamais être présentée comme une confirmation de direct sur une chaîne précise. Un multiplex reste jaune. Les chaînes étrangères connues sont masquées dans `Ma sélection` et réapparaissent avec `Tout voir`.

Les classements, mappings de bouquets et identifications de pays restent des heuristiques MVP : toute ambiguïté doit être visible dans le détail plutôt que transformée en certitude.

## 6. Architecture exploitable

- Node.js 22 + TypeScript.
- SQLite pour l’EPG et les validations.
- caches bruts par fournisseur sous `data/raw/`.
- génération atomique des fichiers de rapport.
- serveur HTTP léger avec `/healthz`.
- Docker Compose, utilisateur non privilégié, volumes persistants, rotation des logs.
- actualisation interne : tennis aujourd’hui/demain au plus toutes les 30 minutes, dates suivantes et autres catalogues avec cache de 6 h, XMLTV selon `--refresh-hours` (6 h par défaut).
- les rapports futurs sont préparés jusqu’au dimanche ; les collectes saisonnières identiques sont mutualisées pour ne pas multiplier les appels F1/MotoGP.
- sauvegarde et restauration fournies dans `scripts/`.

Les noms internes `poc4`, certains noms de rapports et les scripts Windows `*-poc4-*` sont maintenus provisoirement pour compatibilité avec les données et installations existantes. Les nouvelles commandes publiques sont `mvp:*`.

## 7. Critères de sortie MVP1

La cible peut être considérée prête pour le VPS privé lorsque :

- les trois itérations ci-dessus ont été validées sur plusieurs journées chargées et calmes ;
- aujourd’hui/demain restent corrects après minuit et lors de l’actualisation automatique ;
- aucun replay connu n’est présenté en vert ou dans le direct ;
- les bouquets filtrent correctement les principaux diffuseurs français ;
- une panne d’une source ne vide pas les données précédemment utilisables ;
- `/healthz`, logs, sauvegarde et restauration ont été testés ;
- la procédure de déploiement privé est exécutée sans exposer le port 4173 publiquement.

## 8. Suite ordonnée

1. Validation utilisateur des trois itérations sur l’US Open et un week-end riche en football/rugby.
2. Corrections limitées aux défauts bloquants observés ; gel fonctionnel MVP1.
3. Préparation du VPS Ubuntu 24.04, installation Docker et test local au serveur.
4. Accès privé via Tailscale, sans port applicatif public.
5. Test de sauvegarde/restauration et surveillance pendant une semaine.
6. Seulement après stabilité : reprise UX plus ambitieuse, notifications ou extension de couverture.
