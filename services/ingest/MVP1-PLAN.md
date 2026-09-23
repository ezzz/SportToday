# SportToday — plan consolidé MVP1

Dernière consolidation : 18 septembre 2026.

## 1. Cible produit à court terme

La promesse MVP1 est :

> En quelques secondes, trouver les rendez-vous sportifs qui m’intéressent aujourd’hui et demain, avec une diffusion adaptée à mes accès, puis anticiper les principaux temps forts jusqu’au week-end.

Décision du 18 septembre 2026 : rester un outil privé avec authentification, pour Bruno en premier lieu. Quelques testeurs pourront être invités explicitement ; aucune inscription libre ni ouverture publique n'est prévue à court terme. Le produit doit être utile au quotidien sur téléphone. Sa valeur vient de la sélection, de la hiérarchie des événements et de la transparence sur la fiabilité des diffuseurs, pas d'une grille TV exhaustive.

Le parcours principal est :

1. ouvrir Aujourd'hui et voir une synthèse courte, par sport puis compétition, des événements en cours et à venir dans la journée ;
2. basculer sur Demain ou À venir pour anticiper les principaux événements jusqu'au week-end ;
3. limiter la sélection aux sports suivis et aux bouquets disponibles ;
4. comprendre d’un coup d’œil si la diffusion est certaine, probable, issue d’un multiplex ou seulement déduite de droits.

## 2. Périmètre MVP1

- Dates détaillées : aujourd’hui et demain, fuseau `Europe/Paris` ; aperçu synthétique des événements prioritaires jusqu’au dimanche suivant.
- Navigation principale : `Aujourd'hui`, `Demain`, `À venir`, toujours organisée par sport. Le programme TV exhaustif n'est pas la porte d'entrée.
- Sports couverts : football, tennis, Formule 1, MotoGP, golf, rugby (Top 14 et Pro D2), basket (NBA, EuroLeague et compétition féminine suivie), volley, athlétisme et cyclisme sur route sélectionné.
- Football : principales compétitions diffusées en France ; la 2. Bundesliga et les compétitions secondaires non validables restent hors périmètre.
- Accès : authentification obligatoire avant le site et ses endpoints ; Tailscale reste l'accès actuel et le canal d'administration. Aucune exposition directe du port Node sur Internet.

Hors périmètre à court terme : application native, gestion de comptes maison, synchronisation des préférences entre appareils, notifications, scores complets, nouveaux sports, publicité, SEO, acquisition d'audience et analytics marketing. Les devis EPG et la recherche de nouvelles sources contractuelles sont en attente, pas des prérequis pour travailler sur l'UX privée.

## 3. Expérience retenue et état de départ

Le VPS privé et la refonte visuelle ont déjà été utilisés. La présentation bleu nuit est validée ; on ne relance pas un chantier de design général. Les listes ci-dessous décrivent la cible fonctionnelle, pas une certification de l'état du code. Chaque lot de la section 8 commence par vérifier l'existant.

La référence visuelle reste [`UX-REDESIGN.md`](./UX-REDESIGN.md). Les anciennes itérations `Maintenant`, sélection de tête dupliquée et notes de 1 à 5 sont remplacées dans la cible par :

- une synthèse unique et courte, Sport → Compétition → événements par horaire croissant ;
- une journée entière comme horizon par défaut, sans priorité systématique au soir ;
- des lignes compactes : heure, événement, chaînes ; détails repliés ;
- les événements terminés masqués par défaut, accessibles via la journée complète ;
- un marqueur discret pour les événements en cours, sans section supplémentaire ;
- une révélation progressive des matchs, compétitions et sports écartés de la sélection ;
- des préférences simples : favoris et masquage, sans notation ; le filtrage des bouquets reste prioritaire ;
- des commentaires de signalement discrets et contextualisés.

### Historique technique des itérations précédentes

Les trois blocs suivants conservent la trace des fonctionnalités du MVP précédent. Ils ne priment pas sur la cible ci-dessus ; les fonctions utiles sont à préserver sans réintroduire leurs anciens contrôles visuels.

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

La revue des droits et licences est archivée dans [`SOURCE-LICENSING.md`](./SOURCE-LICENSING.md). Le périmètre reste privé, sans publicité ni référencement. L'authentification limite l'accès mais ne fournit aucune autorisation supplémentaire de collecte ou de réutilisation des données. Le maintien technique des sources n'est donc pas une validation juridique ; leurs incertitudes restent consignées et une source doit pouvoir être désactivée si nécessaire.

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

## 7. Critères de finalisation de la version privée

- Un visiteur non autorisé ne peut lire ni pages, ni données JSON, ni exports, ni écrire un commentaire ; aucun accès direct au VPS ne contourne la protection.
- Connexion, expiration de session et révocation sont testées sur téléphone et ordinateur.
- Aujourd'hui, Demain et À venir restent cohérents après minuit ; une couverture partielle n'est jamais présentée comme exhaustive.
- Les détails permettent de distinguer heure sportive, créneau TV, diffusion confirmée et déduction par droits.
- Une panne fournisseur ne vide pas les données utilisables et ne bloque pas indéfiniment l'actualisation.
- Signalements persistants, diagnostic administrateur, sauvegarde et restauration sont vérifiés.
- Aucun besoin de relancer manuellement le serveur pendant une semaine d'usage normal.

## 8. Court terme : quatre lots ordonnés

Ordre révisé avec Bruno le 18 septembre : **lot 2 → lot 3 → lot 4 → lot 1**. Finaliser le site avant tout partage. Tailscale reste le seul accès distant pendant ces travaux ; l'authentification navigateur viendra en dernier, avant une éventuelle invitation. Les numéros restent stables pour retrouver les échanges précédents.

### Lot 1 — accès privé simple et vérifiable

Objectif : consulter confortablement le site depuis un navigateur, sans développer un système de comptes.

- Vérifier la protection actuelle ; conserver Tailscale seul tant que le nouvel accès n'est pas prêt.
- Solution proposée : domaine + Cloudflare Access avec liste explicite d'emails autorisés et connexion par code email. Confirmer le choix et les prérequis avant configuration.
- Préférer un tunnel sortant vers l'application liée à localhost ; aucune ouverture publique du port 4173, aucun chemin alternatif non protégé.
- Couvrir toutes les routes, y compris JSON, exports et signalements. Réserver diagnostics détaillés et exports de feedback à l'administrateur avant d'inviter un tiers.
- Garder SSH et l'administration via Tailscale ; secrets hors Git et navigateur, sessions révocables, aucune inscription libre.
- Ne pas ajouter d'anti-scraping complexe : authentification, restriction d'accès et limites raisonnables sur les écritures suffisent au périmètre visé, sans empêcher un utilisateur autorisé de copier ce qu'il voit.

À préparer avec Bruno : domaine/sous-domaine choisi, compte et configuration DNS compatibles avec la solution retenue, email personnel autorisé. Aucun secret à coller dans la conversation. Pas d'invitation automatique de testeurs.

Validation : accès autorisé sur mobile ; refus sans connexion, pour un email absent de la liste et après révocation ; impossibilité de contourner la protection par l'IP publique ou une route secondaire. Documenter la procédure réelle dans `DEPLOYMENT-PRIVEE.md` après mise en place.

### Lot 2 — donner sa valeur à « À venir »

Implémentation : regroupement sport/compétition, deux événements prioritaires par compétition avec révélation des autres, quatre sports initiaux, course principale F1/MotoGP, respect des bouquets et états vides explicites. Les favoris et les indications d'heure estimée/de droits seuls sont conservés. Validation visuelle sur données réelles à faire ; aucune nouvelle source ni augmentation de quota.

- Réutiliser les sources existantes à horizon suffisant, sans nouveaux abonnements ni appels hors fenêtre autorisée par les plans API.
- Du lundi au jeudi : À venir de J+2 au dimanche. Vendredi : Après-demain, dimanche uniquement. Samedi : Après-demain, lundi uniquement. Dimanche : À venir du mardi au dimanche suivant. Ne jamais dupliquer Demain ; afficher explicitement les périodes sans données.
- Grouper Sport → Compétition ; afficher jour et heure, sélectionner les temps forts (course F1/MotoGP avant essais, étapes et matchs prioritaires).
- Respecter sports masqués et bouquets ; ne pas inventer une chaîne ni assimiler droits généraux et créneau confirmé.
- Signaler sobrement les horaires non publiés et la couverture partielle ; conserver une synthèse courte avec révélation progressive.

Validation : un week-end riche et une période calme, sans doublons de sessions ni événements inventés ; limitation du football futur compréhensible.

### Lot 3 — finaliser le détail et les signalements

Implémentation du 18 septembre : détail commun à Aujourd'hui/Demain et À venir ; faits sportifs, description, programmation et créneaux TV séparés. Sources/diagnostic, préférences et signalement sont repliés séparément. Le commentaire est sauvegardé sans reconstruire la ligne, avec retour de sauvegarde local et date capturée. Les retours conservent désormais leur contexte et survivent au retrait d'un événement du catalogue. Les notes d'intérêt ne sont plus proposées dans le détail.

Confidentialité actuelle : les retours et leur export restent partagés à l'intérieur de l'accès personnel Tailscale ; préférences/favoris restent locaux au navigateur. La séparation administrateur/invité et la restriction des exports appartiennent au lot 1, repoussé avant tout partage. Ne pas inviter de testeur avant ce contrôle. Validation visuelle sur téléphone à faire.

- Garder la ligne synthétique actuelle ; redessiner uniquement le contenu déplié.
- Préserver les informations utiles du MVP : compétition/session, programmation des matchs, description disponible, horaires sportifs et TV séparés, chaînes et provenance/confiance.
- Éviter les répétitions et reléguer le diagnostic technique dans un niveau secondaire.
- Rendre le signalement discret, lié à l'événement ou à la compétition, enregistré côté serveur et récupérable par Bruno.
- Vérifier ce qui est partagé ou propre au navigateur avant tout ajout de testeur ; pas de synchronisation de profils dans ce lot.

Validation : détail lisible sur téléphone, aucune perte d'information utile, commentaire récupérable après redémarrage, aucun export de commentaires accessible à un simple invité.

Retouches du 22 septembre 2026 : le détail courant est ramené à la description, aux créneaux TV et à trois actions compactes ; les faits déjà visibles dans le titre ne sont plus répétés. La date des onglets est agrandie, « Créneaux TV » devient « TV » sur la ligne courte, le bouton de journée est renforcé et la fraîcheur descend en pied de page. Lorsqu'aucun événement ne correspond aux trois prochaines heures mais que d'autres arrivent aujourd'hui, l'ouverture affiche directement la journée. L'API exclut désormais elle aussi les dates de Demain de l'onglet À venir ; cas du dimanche testé depuis les deux onglets.

### Lot 4 — stabiliser l'exploitation quotidienne

- Vérifier les délais maximum des collectes, les actualisations ignorées/reportées, la reprise après panne et le changement J+1 → J.
- Afficher discrètement la fraîcheur des données ; réserver les erreurs détaillées à l'administration.
- Tester sauvegarde/restauration, persistance des retours, redéploiement et retour à la version précédente.
- Surveiller erreurs, temps de refresh, quotas et disponibilité ; pas de traçage individuel ni d'analytics marketing.
- Corriger immédiatement tout blocage de refresh observé, même avant la fin des lots UX.

Validation : une semaine incluant un week-end, avec mise à jour automatique et simulation d'une source indisponible. Ensuite : gel fonctionnel et corrections issues de l'usage privé.

## 9. Documents de référence et sujets en attente

- Ce fichier : seul plan et ordre des priorités.
- [`UX-REDESIGN.md`](./UX-REDESIGN.md) : décisions UX et historique du prototype, pas une deuxième roadmap.
- [`DEPLOYMENT-PRIVEE.md`](./DEPLOYMENT-PRIVEE.md) : exploitation et déploiement ; distinguer l'accès Tailscale actuel de l'accès authentifié proposé.
- [`SOURCE-LICENSING.md`](./SOURCE-LICENSING.md) : preuves et incertitudes conservées ; les démarches liées à une publication publique restent en attente.
- [`README.md`](./README.md) : commandes de lancement et repères techniques.

Une ouverture publique, même sans publicité, nécessite une nouvelle décision et une revue des droits avant tout travail SEO, acquisition ou monétisation. Ce n'est plus la prochaine étape automatique du projet.
