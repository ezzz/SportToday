# SportToday — cadrage UX et refonte visuelle

Document de travail préparatoire au prototype UX local. La piste Figma Starter a été écartée pour cette étape car l'écriture MCP sur le canvas nécessite actuellement un forfait Figma compatible.

Dernière mise à jour : 16 septembre 2026.

## Décisions validées après le questionnaire UX

- Une seule synthèse éditorialisée, sans section `À ne pas manquer` dupliquée.
- Organisation principale par sport, puis compétition, puis horaire.
- La synthèse initiale tient sur une page courte et peut écarter les sports secondaires.
- Un contrôle global révèle uniquement la sélection principale des sports secondaires.
- Un contrôle `+N` au niveau d'une compétition révèle ses autres événements.
- Les événements terminés sont masqués par défaut et réapparaissent via `Voir toute la journée`.
- Les événements en cours restent à leur place et utilisent une indication rouge discrète `DIRECT`.
- Navigation temporelle : `Aujourd'hui`, `Demain`, `À venir` ; cette dernière reste organisée par sport sur plusieurs jours.
- En-tête fonctionnel : nom, recherche contextuelle, `À propos` et réglages.
- La recherche filtre la synthèse de l'onglet courant sans ouvrir de page séparée.
- Réglages progressifs : sports affichés et accès TV par bouquet. Un bouquet masqué l'emporte pour l'instant sur les favoris.
- Interface essentiellement typographique, avec un petit pictogramme monochrome par sport et sans logos colorés.
- Modes clair et sombre dès le prototype.
- Conception mobile en priorité ; colonne centrale de 800 px maximum sur ordinateur.

Le prototype est disponible sur `/prototype` lorsque le serveur SportToday est lancé.

## 1. Objectif de la refonte

La refonte ne doit pas simplement moderniser les couleurs et les cartes. Elle doit rendre immédiatement compréhensible la proposition de SportToday :

> Aider à choisir rapidement un événement sportif intéressant à regarder, selon le moment, ses sports et ses diffuseurs, puis permettre d'anticiper les grands rendez-vous du week-end.

La différence recherchée avec un programme TV sportif exhaustif est une sélection événementielle, personnalisée et hiérarchisée. L'interface doit ressembler davantage à un agenda éditorial calme qu'à un tableau de bord, une grille TV ou une accumulation de widgets.

## 2. Utilisateur et situations principales

La cible actuelle reste une bêta privée mono-utilisateur, consultée surtout sur téléphone.

Les trois situations prioritaires sont :

1. **Décision immédiate** — « Qu'est-ce que je peux regarder maintenant ou ce soir ? »
2. **Exploration d'une journée** — « Quels événements intéressants ont lieu aujourd'hui ou demain ? »
3. **Anticipation** — « Quel grand rendez-vous ne dois-je pas manquer d'ici dimanche ? »

Les réglages, la validation des données et le diagnostic des fournisseurs sont nécessaires au produit en construction, mais ne constituent pas le parcours principal de consultation.

## 3. Inventaire fonctionnel existant

### 3.1 Consultation principale

| Fonction | État fonctionnel | Exposition actuelle | Contrat à préserver |
| --- | --- | --- | --- |
| Vue événementielle `À voir` | opérationnelle | onglet principal | rester la porte d'entrée |
| Dates Aujourd'hui / Demain | opérationnelles | barre supérieure | accessibles en une action |
| Maintenant / Ce soir / Journée | opérationnels | barre supérieure | conserver les trois intentions, avec un défaut contextuel |
| `À ne pas manquer` | opérationnel | avant la liste complète | sélection courte, personnalisée et chronologique |
| Regroupement Sport / Compétition | opérationnel | liste repliable | préserver les deux niveaux sans leur donner le même poids visuel |
| Horaire officiel | opérationnel | début de ligne | rester l'information de lecture principale |
| Chaînes et plateformes | opérationnelles | fin de ligne | rester visibles sans ouvrir le détail |
| Niveau de confiance de la diffusion | opérationnel | couleur verte, jaune ou rouge | conserver le sens, sans multiplier les explications visibles |
| Événement terminé | opérationnel | ligne grisée et libellé | rester distinct sans disparaître de la journée |
| Aperçu jusqu'au dimanche | opérationnel sur les sources compatibles | après la liste détaillée | doit devenir plus facile à découvrir |
| Agenda TV | opérationnel | second onglet | rester secondaire par rapport aux événements |

### 3.2 Personnalisation

| Fonction | État fonctionnel | Exposition actuelle | Contrat à préserver |
| --- | --- | --- | --- |
| Ma sélection / Tout voir | opérationnel | barre supérieure | permettre de contourner rapidement les préférences |
| Sports masqués | opérationnel, stockage navigateur | panneau imbriqué | choix permanent et réversible |
| Bouquets disponibles | opérationnel, stockage navigateur | panneau imbriqué | filtrage par bouquet plutôt que chaîne individuelle |
| Compétitions masquées | opérationnel, stockage navigateur | action dans le détail puis gestion dans les préférences | choix permanent et réversible |
| Favoris compétition/équipe | opérationnels, stockage navigateur | détail de chaque événement | doivent continuer à influencer la sélection |
| Intérêt sport et compétition, de 1 à 5 | opérationnel, stockage navigateur | détail de chaque événement | doit continuer à influencer `À ne pas manquer` sans modifier l'ordre chronologique |
| Filtres ponctuels par sport | opérationnels | panneau avancé | se combinent aux préférences permanentes |

### 3.3 Validation et diagnostic

| Fonction | État fonctionnel | Exposition actuelle | Contrat à préserver |
| --- | --- | --- | --- |
| Verdict et commentaire par événement | opérationnels, stockage serveur | détail de chaque événement | rester accessibles pendant la bêta |
| Signalement d'un événement manquant | opérationnel, stockage serveur | panneau Qualité | rester disponible |
| Commentaire général de debug | opérationnel, stockage serveur | panneau Qualité | rester disponible en ligne |
| Export global des retours JSON | opérationnel | panneau Qualité | rester récupérable |
| Exports CSV et XLSX | opérationnels | panneau avancé | conserver pour le contrôle, pas dans le parcours lecteur |
| Couverture EPG et erreurs fournisseurs | opérationnelles | panneau Qualité | conserver comme diagnostic administrateur |
| Statistiques de couverture | opérationnelles | pied de page | conserver sans concurrencer le contenu sportif |
| Fraîcheur des données | opérationnelle | sous le titre | rester consultable de façon discrète |
| Actualisation automatique et healthcheck | opérationnels | sans commande dans l'interface | ne pas réintroduire de bouton de rafraîchissement bloquant |

## 4. Fonctions insuffisamment mises en valeur

Il ne s'agit pas nécessairement de fonctions manquantes dans le code, mais de fonctions difficiles à découvrir ou à comprendre dans l'interface actuelle.

1. **L'aperçu du week-end arrive trop tard.** Il est placé après toute la liste détaillée alors qu'il porte une partie importante de la différenciation du produit.
2. **La personnalisation est presque invisible.** Favoris, notes d'intérêt et masquage d'une compétition nécessitent d'ouvrir le détail d'un événement.
3. **Il n'existe pas de vue synthétique des choix enregistrés.** Les sports et compétitions masqués sont gérables, mais les favoris et notes ne le sont pas globalement.
4. **`Ma sélection` est ambigu.** Le libellé ne dit pas immédiatement s'il correspond aux bouquets, aux sports, aux favoris ou aux trois.
5. **La confiance de diffusion repose surtout sur la couleur.** Son sens est expliqué dans les détails, mais l'état intermédiaire reste difficile à interpréter sans apprentissage.
6. **Le feedback en ligne est enfoui dans le diagnostic.** C'est cohérent pour un futur lecteur, moins pratique pendant la bêta de validation.
7. **Agenda TV et validation cohabitent avec le produit lecteur.** Cela donne l'impression que tous les outils ont la même importance.
8. **Les états vides expliquent peu la cause.** Une absence peut venir de l'horaire, des préférences, des bouquets ou des données sources.

## 5. Problèmes de hiérarchie observés

- La barre supérieure mélange navigation, période, préférences et accès aux réglages.
- `À ne pas manquer` répète ensuite les mêmes événements dans `Tous les rendez-vous`, sans transition éditoriale forte.
- Les niveaux Sport, Compétition et Événement utilisent tous des conteneurs visuels proches.
- Les badges, couleurs, textes d'explication, boutons et panneaux repliables créent plusieurs signaux concurrents.
- Le vocabulaire technique de validation apparaît dans la même page que le vocabulaire destiné au lecteur.
- Les informations rares mais importantes — événement majeur futur, anomalie de source — ont parfois moins de présence que les commandes permanentes.
- Sur téléphone, la lecture verticale est longue avant d'atteindre l'anticipation et les réglages utiles.

## 6. Priorité d'information proposée pour le wireframe

Cette hiérarchie est une hypothèse de départ à valider ensemble, pas encore une décision graphique.

### Niveau 1 — décision

- date et période consultées ;
- 2 à 4 événements `À ne pas manquer` ;
- horaire, affiche et diffuseur ;
- indication uniquement si la diffusion est incertaine.

### Niveau 2 — anticipation et exploration

- principaux rendez-vous jusqu'au dimanche ;
- navigation par sport ;
- événements classés par compétition puis horaire.

### Niveau 3 — personnalisation

- sports suivis ou masqués ;
- bouquets disponibles ;
- compétitions, équipes et niveaux d'intérêt.

### Niveau 4 — contrôle de la donnée

- Agenda TV ;
- feedback de bêta ;
- validation détaillée ;
- qualité des sources, statistiques et exports.

## 7. Principes de design à imposer

1. Concevoir d'abord le téléphone, avec un écran de référence proche de 390 px de large.
2. Utiliser les vraies longueurs de titres, de compétitions et de chaînes du rapport SportToday.
3. Une information ne doit être visible en permanence que si elle aide à choisir un programme.
4. Préférer typographie, alignement et séparateurs à l'empilement de cartes.
5. Limiter les pastilles aux états réellement actionnables ou exceptionnels.
6. Employer une seule couleur d'accent de marque ; garder vert, jaune et rouge uniquement pour la confiance de diffusion.
7. Éviter gradients, verre dépoli, grandes ombres, illustrations génériques et séries de widgets identiques.
8. Le détail technique doit être accessible par divulgation progressive, jamais imposé dans le premier niveau de lecture.
9. Chaque interaction cachée doit avoir un libellé ou une affordance compréhensible, pas seulement une icône ambiguë.
10. Vérifier chaque écran dans quatre états : peu de contenu, journée chargée, source partielle et aucun résultat.

## 8. Points à décider ensemble avant les wireframes

### A. Structure générale

- `À ne pas manquer` doit-il être suivi immédiatement de l'aperçu du week-end, avant la liste complète ?
- Les sports doivent-ils être une navigation horizontale, des sections verticales ou les deux selon l'écran ?
- L'Agenda TV doit-il rester un onglet de même niveau ou devenir une vue secondaire accessible depuis un menu ?

### B. Personnalisation

- Préférences réunies dans un écran/panneau unique ou actions placées au fil de la consultation ?
- Conserver à la fois favoris et notes 1–5, ou simplifier en un seul modèle d'intérêt ?
- Montrer explicitement pourquoi un événement est recommandé, ou réserver cette explication au détail ?

### C. Bêta et diagnostic

- Créer un véritable mode `Diagnostic` séparé du mode lecteur, ou garder un panneau discret dans la même page ?
- Le champ de feedback général doit-il rester accessible partout pendant la bêta ?
- Les verdicts ligne par ligne sont-ils encore nécessaires dans la prochaine version visuelle ?

### D. Identité visuelle

- Direction éditoriale sobre, proche d'un agenda sportif premium ;
- direction plus énergique inspirée de la retransmission sportive ;
- degré de présence souhaité pour les pictogrammes, logos de sports et logos de chaînes.

## 9. Livrables de l'étape 2

Après arbitrage des points précédents :

1. un flux principal mobile couvrant Aujourd'hui, Demain et l'aperçu du week-end ;
2. deux wireframes basse fidélité maximum ;
3. les états ouvert/replié des sports, détails et préférences ;
4. une adaptation desktop de la variante retenue ;
5. une checklist reliant chaque fonction de l'inventaire à son emplacement dans la maquette.

Le wireframe doit rester en niveaux de gris. Les couleurs, typographies et composants détaillés ne seront choisis qu'après validation de son organisation.

## 10. Organisation du fichier Figma Starter

Pour rester dans les limites du forfait gratuit, utiliser un seul fichier `SportToday — UX MVP1` avec trois pages :

1. `00 — Cadrage` : promesse, priorités, inventaire et références retenues ;
2. `01 — Mobile` : flux et wireframes du téléphone ;
3. `02 — Desktop & UI` : adaptation desktop, composants et direction visuelle.

Le fichier ne doit contenir aucune clé API ni donnée privée. Des événements et chaînes réels peuvent être utilisés comme contenu de démonstration.

## 11. Critères de validation de la future maquette

La maquette sera validée si :

- l'utilisateur peut identifier en moins de cinq secondes le prochain événement intéressant ;
- Aujourd'hui, Demain et Ce soir sont compréhensibles sans explication ;
- l'aperçu du week-end est visible sans parcourir toute la journée ;
- l'heure, l'affiche et le diffuseur dominent visuellement chaque ligne ;
- les informations de confiance restent disponibles sans envahir la lecture ;
- toutes les fonctions de l'inventaire ont une destination explicite ;
- le diagnostic et les exports ne donnent plus l'impression d'être des fonctions centrales ;
- une journée chargée reste lisible sur téléphone sans accumulation de cartes et de badges.

## 12. Arbitrages du prototype visuel

- Conserver la densité actuelle, les onglets `Aujourd'hui / Demain / À venir`, le survol des lignes et l'action globale `+ N autres sports`.
- Porter la séparation colorée au niveau du sport entier, et non au niveau intermédiaire de la compétition.
- Présenter les compétitions sous la forme `Compétition / contexte` : par exemple `Ligue 1 / 3e journée` ou `Grand Prix d'Espagne / 12e Grand Prix de la saison`.
- Réunir le nombre d'éléments masqués et leur ouverture dans une seule action explicite : `Afficher les 2 autres matchs`.
- Renforcer le diffuseur par la graisse et le contraste, sans ajouter une nouvelle pastille.
- Suspendre les pictogrammes sportifs tant qu'une famille cohérente et correctement dessinée n'est pas retenue.
- Palette bleu nuit validée ; le comparateur temporaire a été retiré.
- Remplacer les comptages génériques comme `rendez-vous` ou `affiches retenues` par un contexte utile : `Dès 17:00`, `Samedi`, etc.
- Réserver le rouge à l'état `Direct`.

## 13. Passage au MVP réel

La direction validée est désormais appliquée à la page principale alimentée par les rapports :

- en-tête SportToday, recherche réelle et navigation `Aujourd'hui / Demain / À venir` ;
- synthèse unique organisée par sport puis compétition ;
- rail bleu au niveau du sport, contexte temporel utile et séparateur de compétition ;
- deux événements visibles au maximum par compétition, avec ouverture explicite du complément ;
- heure, affiche et diffuseurs sur la ligne principale ;
- marqueur rouge uniquement quand l'événement est effectivement en cours ;
- réglages, validation et diagnostic conservés mais retirés de la lecture principale ;
- route `/prototype` conservée temporairement comme référence pendant la stabilisation.
