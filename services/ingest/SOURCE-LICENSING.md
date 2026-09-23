# SportToday — audit des licences et droits des sources

Audit initial : 18 septembre 2026.
Périmètre : sources effectivement présentes dans le MVP1 et sources historiques encore configurées.

> Ce document est une revue technique et documentaire, pas un avis juridique. Il consigne les conditions trouvées, les incertitudes et les décisions de mise en production. Les conditions des fournisseurs peuvent changer : elles doivent être revérifiées avant une ouverture publique ou une monétisation.

## Conclusion opérationnelle

Décision produit du 18 septembre 2026 : conserver une **bêta privée avec authentification, personnelle et sans publicité**, sans projet d'ouverture publique à court terme. Ce choix restreint la diffusion ; il ne constitue pas une validation juridique de la collecte ni de la réutilisation, y compris privée. Plusieurs sources ne donnent pas de licence explicite pour republier leurs données, certaines restreignent l'usage automatisé ou commercial, et les conditions d'API-Sports reportent sur l'utilisateur l'obtention des droits nécessaires. Une absence d'autorisation trouvée n'est pas, à elle seule, la preuve d'une illégalité.

Les blocages principaux sont :

1. **XMLTVFr**, source TV centrale : le dépôt et le site donnent des indications de licence incohérentes pour le logiciel (MIT contre Apache 2.0), mais aucune licence claire n'a été trouvée pour republier le flux généré et les données issues de ses nombreux fournisseurs amont.
2. **ESPN Tennis/Golf** : endpoint public mais non documenté et non contractuel ; les conditions ESPN/Disney interdisent notamment l'extraction automatisée sans autorisation écrite.
3. **MotoGP** : endpoint interne public mais non contractuel ; les conditions MotoGP limitent l'usage au personnel et interdisent de fournir, copier ou transmettre le contenu.
4. **World Athletics** : la Diamond League est extraite d'une page web sans API ni licence de republication documentée.
5. **Jolpica F1** : autorisé en non-commercial sous CC BY-NC-SA 4.0, mais une autorisation distincte est requise dès que le site devient commercial, notamment avec de la publicité.
6. **API-Sports** : les sites et applications sont des usages envisagés, mais le fournisseur précise qu'il ne délivre pas lui-même de licence de publication ni de droits commerciaux sur les compétitions.

Décision : **ne pas rendre le site public et ne pas activer de publicité avant traitement des points rouges et orange ci-dessous**.

## Légende

- **Vert** : utilisation actuelle documentée et compatible, sous réserve des obligations indiquées.
- **Orange** : usage possible ou factuel, mais autorisation écrite, clarification ou validation juridique nécessaire avant publication.
- **Rouge** : source non contractuelle ou conditions incompatibles avec la republication envisagée ; à désactiver ou remplacer en production publique.
- **Gris** : source non utilisée par le MVP ; elle ne doit pas être réactivée sans nouvelle revue.

## Matrice source par source

| Source | Usage actuel | Bêta privée sans revenu | Site public sans publicité | Site avec publicité | Décision |
| --- | --- | --- | --- | --- | --- |
| XMLTVFr | horaires, titres, descriptions et chaînes TV | Orange | Rouge | Rouge | Obtenir un accord écrit couvrant le flux dérivé, le cache et l'affichage public. Ne pas confondre la licence Apache du collecteur avec celle des données. |
| API-Football / Volleyball / Basketball / Rugby (API-Sports) | événements, horaires et compétitions | Orange | Orange | Rouge | Demander une confirmation écrite pour SportToday et limiter l'affichage aux faits nécessaires, sans logos ni images. Une éventuelle réponse d'API-Sports ne remplace pas les droits des compétitions. |
| ESPN Tennis / Golf | tableaux de matchs et calendriers détaillés | Orange | Rouge | Rouge | Désactiver pour une version publique tant qu'aucun contrat ou accord écrit ne couvre cet endpoint et la republication. |
| Jolpica F1 | calendrier et horaires F1 | Vert avec attribution | Vert avec attribution et sans contrepartie commerciale | Rouge | Ajouter l'attribution et respecter CC BY-NC-SA 4.0. Contacter `admin@jolpi.ca` avant publicité, abonnement, sponsoring ou autre usage commercial. |
| MotoGP.com | calendrier et sessions MotoGP | Orange | Rouge | Rouge | Endpoint interne non contractuel ; demander une autorisation ou le remplacer par une source licenciée. |
| World Athletics | calendrier Diamond League automatiquement extrait | Orange | Rouge | Rouge | Ne pas scraper en production publique sans permission. Une petite sélection manuelle de faits sourcés reste à faire valider séparément. |
| World Athletics Ultimate | trois sessions saisies manuellement depuis une publication officielle | Orange | Orange | Orange/Rouge | Conserver uniquement des faits courts, reformulés et sourcés ; ne pas reprendre les textes, visuels ou logos. Demander confirmation avant monétisation. |
| UCI et organisateurs des Grands Tours | dates 2026 saisies manuellement | Orange | Orange | Orange/Rouge | Usage limité à quelques faits calendaires, reformulés et sourcés. Éviter toute reprise substantielle du calendrier, des descriptifs, cartes, logos ou photos. |
| Règles de droits DAZN / Disney+ | indication de plateformes par compétition | Orange | Orange | Orange | Conserver des règles datées, des liens de preuve et une formulation factuelle. Ne pas reprendre les marques graphiques et ne pas suggérer de partenariat. |
| TheSportsDB | ancien diagnostic POC3 | Gris | Gris | Gris | Laisser hors du runtime MVP. Si réactivé, choisir le plan adapté et vérifier chaque image ; les contenus tiers restent soumis à leurs propres droits. |
| XMLTVFREE | ancien fallback XMLTV | Gris | Gris | Gris | Conditions et provenance insuffisamment claires : conserver désactivé et ne pas l'utiliser en production publique. |
| API-Tennis | adaptateur non activé | Gris | Gris | Gris | Refaire l'audit des conditions et du plan avant toute activation. |

## Éléments vérifiés

### XMLTVFr et format XMLTV

- La [documentation XMLTVFr](https://www.xmltvfr.fr/docs.php) annonce le **logiciel** sous licence Apache 2.0 et explique qu'il agrège de multiples services, notamment Bouygues, DAZN, L'Équipe Live, MyCanal et Orange.
- Le [`composer.json` du dépôt actuel](https://github.com/racacax/XML-TV-Fr/blob/master/composer.json) déclare au contraire une licence MIT. Au commit `c08be2ed2ec2477fa5439f900dc5ab6db17a4819` inspecté le 18 septembre 2026, aucun fichier `LICENSE`, `LICENCE`, `COPYING` ou `NOTICE` n'est présent à la racine. Cette incohérence affaiblit même la documentation de la licence du code, sans modifier la question distincte des données.
- La [page des flux générés](https://xmltvfr.fr/xmltv.php) autorise matériellement leur téléchargement et demande de privilégier les formats compressés, mais aucune licence de republication des données n'y est indiquée.
- Le [projet XMLTV](https://github.com/XMLTV/xmltv) place ses outils sous GPL-2.0 et autorise l'usage du format XMLTV. Cela ne concède pas les droits sur le contenu d'un guide particulier.

Conclusion : téléchargement accessible ne signifie pas autorisation de republier. La provenance multiple rend indispensable une confirmation écrite de XMLTVFr, idéalement accompagnée de la portée de ses accords avec les sources amont.

#### Résultat de l'inspection du code source XMLTVFr

Le dépôt [`racacax/XML-TV-Fr`](https://github.com/racacax/XML-TV-Fr) a été téléchargé et inspecté à la révision indiquée ci-dessus :

- le projet contient plus de trente adaptateurs qui interrogent directement des pages ou endpoints de MyCanal, Orange, Bouygues, SFR, Télérama, Télé-Loisirs, L'Équipe Live, OQEE et d'autres fournisseurs ;
- certains adaptateurs extraient aussi synopsis, catégories, distributions et images, donc pas seulement des horaires élémentaires ;
- le collecteur utilise cache et priorités pour choisir un fournisseur par chaîne et par journée ;
- le formateur intermédiaire ajoute le nom de la classe fournisseur en commentaire, mais l'exporteur reconstruit ensuite le document avec SimpleXML ;
- vérification faite sur le flux réellement téléchargé par SportToday le 18 septembre 2026 : seule la mention générale `Generated with XML TV Fr v4.0.0` subsiste. Le fournisseur amont de chaque programme n'est donc pas identifiable dans le flux final.

Cette dernière limite empêche SportToday de sélectionner uniquement des programmes provenant d'un fournisseur amont dont les conditions seraient compatibles. Une évolution utile de XMLTVFr serait de conserver une provenance structurée par programme, mais cela ne remplacerait toujours pas l'autorisation des fournisseurs concernés.

### Effet d'une publication sans publicité

L'absence de publicité améliore sensiblement la situation, mais **public** et **non commercial** ne signifient pas **usage personnel** :

- Jolpica F1 devient clairement utilisable, avec attribution et respect de CC BY-NC-SA 4.0 ;
- API-Sports reste orange : ses conditions envisagent la création de sites, mais ne fournissent pas la licence de publication des compétitions ;
- les calendriers manuels et les règles de droits, limités à quelques faits courts et sourcés, présentent un risque plus faible ;
- XMLTVFr reste à clarifier, car le problème est la republication publique du flux agrégé, pas seulement la monétisation ;
- ESPN et MotoGP restent rouges : leurs restrictions couvrent aussi l'extraction automatisée, la copie ou la transmission gratuite ;
- le scraping World Athletics reste rouge faute d'autorisation documentée.

Une bêta publique sans publicité peut donc être envisagée avec un **profil de sources réduit** : Jolpica, faits manuels limités et éventuellement API-Sports après réponse écrite. Le site actuel complet, qui dépend de XMLTVFr et des endpoints non contractuels, n'est pas encore formellement sécurisé pour cette ouverture.

### API-Sports

Les [conditions API-Sports](https://api-sports.io/terms) indiquent à la fois que les données peuvent servir à créer des sites et applications et que :

- la revente directe des données est interdite ;
- API-Sports ne fournit pas de licence de publication des données ;
- certaines données sont soumises aux droits de ligues, fédérations ou organisateurs ;
- l'utilisateur doit obtenir les autorisations nécessaires et API-Sports ne lui accorde pas de droits commerciaux sur les compétitions ;
- logos, images et contenus de marque peuvent exiger d'autres licences.

Conclusion : l'abonnement API, gratuit ou payant, donne accès au service mais ne solde pas les droits de republication. Le risque peut être réduit en n'affichant que des faits élémentaires — noms, date, heure — sans images, logos, statistiques massives ni copie d'une base complète, mais une clarification écrite reste nécessaire.

### ESPN Tennis et Golf

- ESPN renvoie vers les [conditions Disney](https://disneytermsofuse.com/) depuis sa [page officielle de support](https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use).
- L'accord ESPN/Disney publié pour ses services interdit l'accès, la copie ou l'extraction par robot, script ou autre moyen automatisé sans permission écrite, ainsi que la construction d'une activité commerciale à partir du service.
- L'ancien guide de marque de l'API ESPN évoquait une attribution obligatoire, mais il ne constitue pas un contrat actuel couvrant les endpoints `site.api.espn.com` utilisés par SportToday.

Conclusion : le caractère accessible sans clé ne suffit pas. Ces deux adaptateurs doivent être considérés comme POC et désactivés avant publication, sauf accord écrit d'ESPN.

### Jolpica F1

Les [conditions Jolpica-F1](https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md) autorisent l'usage non commercial et placent les données sous **CC BY-NC-SA 4.0**. Elles demandent de contacter `admin@jolpi.ca` pour un usage commercial et d'observer les limites de débit.

Obligations avant même une bêta publique non commerciale :

- afficher une attribution visible vers Jolpica-F1 ;
- mentionner CC BY-NC-SA 4.0 et l'existence de transformations ;
- conserver une fréquence de cache raisonnable ;
- ne pas utiliser logos, marques ou médias F1 sur la seule base de cette licence.

Une page comportant de la publicité sera présumée commerciale pour notre décision interne : permission préalable obligatoire.

### MotoGP

Les [conditions officielles MotoGP](https://www.motogp.com/en/legal-notice) réservent l'utilisation des canaux à des fins personnelles et interdisent de fournir, copier, échanger, modifier, vendre ou transmettre leur contenu, gratuitement comme contre rémunération.

Conclusion : l'endpoint `api.motogp.pulselive.com` utilisé par le site n'est pas une API publique contractuelle. Il doit être remplacé ou autorisé par écrit avant mise en ligne publique.

### World Athletics

SportToday extrait actuellement les données `__NEXT_DATA__` de la page calendrier Diamond League. Aucune API publique ni licence de republication n'a été trouvée. Les anciennes [conditions du flux RSS World Athletics](https://worldathletics.org/news/news/iaaf-launches-new-rss-feed-service-for-subscr) limitaient déjà la syndication au personnel, au non lucratif et à l'éducatif non commercial ; elles ne couvrent pas l'extraction actuelle.

Conclusion : cette source reste acceptable comme expérimentation privée, pas comme fournisseur public. Pour les quelques sessions Ultimate et grands rendez-vous saisis manuellement, limiter la reprise aux faits indispensables et conserver le lien officiel.

### TheSportsDB

Les [conditions TheSportsDB](https://www.thesportsdb.com/docs_terms_of_use.php) permettent de copier et modifier le contenu retourné par les endpoints officiels, mais encadrent le plan gratuit, interdisent le scraping du site et imposent une vérification séparée des images et contenus tiers. Le MVP ne l'utilise plus pour produire la page principale : il reste donc hors périmètre de production.

## Pourquoi les faits seuls ne règlent pas tout

Une date ou un score isolé n'est pas assimilable à la copie d'un article. En revanche, l'extraction répétée et systématique d'un ensemble structuré peut engager des droits sur la base elle-même. La [directive européenne 96/9/CE](https://eur-lex.europa.eu/legal-content/fr/ALL/?uri=CELEX%3A31996L0009) protège notamment contre l'extraction ou la réutilisation d'une partie substantielle et contre certaines extractions répétées de parties non substantielles.

Conséquences pratiques pour SportToday :

- afficher une sélection éditorialisée plutôt qu'un miroir des fournisseurs ;
- ne jamais exposer les réponses brutes ni proposer leur téléchargement ;
- ne collecter et conserver que les champs réellement utilisés ;
- éviter logos, photos, descriptions longues et textes repris tels quels ;
- conserver pour chaque règle manuelle la source, la date de vérification et le lien ;
- prévoir une attribution et une page « Sources et méthodologie » ;
- rappeler que ces précautions réduisent le risque sans remplacer une licence manquante.

## Feu vert requis avant ouverture publique

### Minimum indispensable

- [ ] Accord écrit de XMLTVFr sur l'affichage public d'un sous-ensemble dérivé du flux, le cache local, la durée de conservation, l'attribution et un éventuel usage financé par publicité.
- [ ] Réponse écrite d'API-Sports décrivant l'usage de SportToday ; décider ensuite si une validation juridique complémentaire est nécessaire pour les compétitions retenues.
- [ ] ESPN Tennis et Golf désactivés ou remplacés par une source contractuelle.
- [ ] Endpoint MotoGP désactivé, remplacé ou autorisé par écrit.
- [ ] Scraping World Athletics désactivé, remplacé ou autorisé par écrit.
- [ ] Attribution Jolpica affichée ; accord commercial reçu avant toute publicité.
- [ ] XMLTVFREE, TheSportsDB et API-Tennis absents du chemin de production tant que leur réactivation n'a pas été auditée.
- [ ] Page publique « Sources et méthodologie », mentions légales et procédure de retrait/correction disponibles.

### Questions à envoyer à chaque fournisseur

1. Pouvons-nous afficher publiquement en France un sous-ensemble normalisé des données dans un site gratuit ?
2. Pouvons-nous mettre ces données en cache côté serveur et, si oui, pendant combien de temps ?
3. La présence future de publicité, de sponsoring ou d'un abonnement change-t-elle l'autorisation ou le plan requis ?
4. Quelle attribution et quel lien devons-nous afficher ?
5. Pouvons-nous combiner ces données avec d'autres sources sans exposer ni revendre le flux brut ?
6. Existe-t-il des restrictions propres aux compétitions, chaînes, équipes, athlètes, images ou marques ?
7. Quelle fréquence d'appel et quelles limites techniques devons-nous respecter ?

Conserver les réponses écrites dans un dossier privé de conformité, avec la date, l'interlocuteur, le plan souscrit et la version des conditions acceptées.

## Démarches reportées — uniquement si une ouverture publique est reconsidérée

Ces démarches et les alternatives ci-dessous restent archivées pour référence. Elles ne font plus partie du travail à court terme ; l'ordre opérationnel est celui de `MVP1-PLAN.md`. Les obligations applicables aux usages actuels, notamment les attributions, ne sont pas reportées pour autant.

1. Contacter **XMLTVFr** en premier : sans clarification, le cœur « horaire + chaîne » ne peut pas être considéré comme sécurisé pour le public.
2. Contacter **API-Sports** avec une capture et une description exacte du produit, en précisant qu'il ne revend pas le flux et n'utilise pas les logos.
3. Remplacer ou couper **ESPN**, **MotoGP** et le scraping **World Athletics** dans un profil `public`.
4. Ajouter les attributions et une page sources avant le référencement.
5. N'envisager publicité et monétisation qu'après permissions commerciales, particulièrement pour Jolpica et les données TV.

## Alternatives contractuelles à XMLTVFr

Les alternatives crédibles existent, mais elles sont principalement B2B et fonctionnent sur devis. SportToday doit demander un périmètre réduit — par exemple 15 à 30 chaînes sportives françaises, horaires et titres seulement, sept jours, faible audience — plutôt qu'un guide TV généraliste complet.

| Fournisseur | Intérêt pour SportToday | Limite / action |
| --- | --- | --- |
| [Plurimedia](https://www.plurimedia.fr/) | Acteur français spécialisé, présenté comme premier fournisseur français de guides TV, plus de 1 000 chaînes et une API EPG documentée derrière authentification. Candidat prioritaire. | Prix non public : demander un devis « petit site non commercial, faible trafic, chaînes sport uniquement ». |
| [Media Press](https://www.media-press.tv/fr/products/) | Métadonnées TV linéaires licenciables, couverture internationale et API documentée ; propose également des métadonnées sportives. | Offre B2B sur devis ; demander si un contrat réduit ou startup existe. |
| [Simply.TV](https://www.simply.tv/) | Fournisseur mondial de listings et métadonnées sport, livraisons API/XML et compte de test sur quelques chaînes. | B2B sur devis ; confirmer explicitement la couverture des chaînes françaises prioritaires. |
| [Gracenote On API](https://docs.gracenote.com/) | Solution de référence pour guides TV et événements sportifs, avec lineups et horaires dans plus de 55 pays. | Probablement dimensionnée et tarifée pour des acteurs plus importants ; utile comme référence ou devis comparatif. |
| [EPG Service](https://epgservice.tv/en/products/) | Contrat de service, JSON/XMLTV, sandbox et tarification publique à partir d'environ 250 USD/mois pour l'EPG. | Vérifier la société, les droits concédés et la couverture France avant essai ; prix déjà élevé pour le MVP. |
| EPG.best | API techniquement simple et déjà identifiée pendant le POC. | Ne constitue une alternative juridique que si le contrat confirme la publication sur notre site et la provenance licenciée des chaînes françaises. Les conditions accessibles publiquement ne suffisent pas actuellement. |

Schedules Direct n'est pas une solution pour un site public : son [contrat d'abonnement](https://www.schedulesdirect.org/sagreement) interdit notamment la republication, la mise en ligne des données ou de leurs dérivés sur un serveur Internet sans accord écrit.

### Demande de devis minimale

Envoyer le même cahier des charges à Plurimedia, Media Press et Simply.TV :

- site web français gratuit et initialement sans publicité ;
- moins de 10 000 visiteurs mensuels pour le lancement ;
- affichage d'une sélection de programmes sportifs, pas d'une grille complète ;
- 15 à 30 chaînes françaises prioritaires ;
- champs nécessaires : chaîne, début, fin, titre et éventuellement catégorie ;
- aucune image, logo, distribution ou description longue ;
- horizon de sept jours et actualisation toutes les six heures ;
- cache serveur et conservation courte ;
- droit explicite d'affichage public sur le site et possibilité future de publicité, tarifée séparément si nécessaire.

## Site discret ou réellement privé

Une URL accessible sans authentification reste juridiquement et techniquement publique, même sans lien entrant, publicité ou référencement. `noindex` empêche les moteurs coopératifs d'afficher la page, mais n'empêche ni l'accès direct, ni le partage de l'URL, ni les robots qui ignorent la consigne. Google recommande une protection par mot de passe pour un contenu réellement privé.

Ordre de risque retenu :

1. **Tailscale uniquement** : bêta personnelle réellement privée, solution actuelle la plus prudente.
2. **Nom de domaine + Cloudflare Access** : bêta privée sur Internet, utilisateurs autorisés par adresse email et code temporaire ; bon choix pour quelques testeurs non techniques.
3. **Basic Auth sur le reverse proxy** : privé mais mot de passe partagé, acceptable pour un très petit groupe.
4. **URL publique avec `noindex`** : faible visibilité seulement ; le contenu reste publié et cette option ne résout aucun problème de licence.
5. **Site public référencé** : nécessite les sources contractuelles et permissions prévues ci-dessus.

Pour la prochaine phase, le compromis conseillé est **Cloudflare Access avec une liste d'adresses autorisées**, tout en gardant XMLTVFr pour la bêta. Cela permet de tester le vrai domaine et l'exploitation du VPS sans présenter cette phase comme une publication publique.

## Suivi

| Date | Source | Action | Résultat / preuve |
| --- | --- | --- | --- |
| 2026-09-18 | Toutes | Audit documentaire initial | Ce document |
| 2026-09-18 | Toutes | Cible privée avec authentification retenue | Plan consolidé ; droits amont toujours incertains, aucune nouvelle autorisation obtenue |
| Reporté | XMLTVFr | Demande d'autorisation de publication | Avant réexamen d'une ouverture publique |
| Reporté | API-Sports | Demande de clarification pour publication | Avant réexamen d'une ouverture publique |
| Reporté | Jolpica-F1 | Demande avant monétisation | Attribution actuelle à conserver/vérifier |
| Reporté | ESPN / MotoGP / World Athletics | Recherche de sources contractuelles ou autorisations de publication | Avant réexamen d'une ouverture publique |
