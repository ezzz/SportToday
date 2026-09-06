# Suite de la validation du 5 septembre

## Comportement livré

- Période Journée / Soirée accessible directement sous Vue et Date ; accès à la journée complète et compteur de période visible.
- Agenda complet des compétitions suivies dans la période sélectionnée, y compris les événements sans diffuseur. Les mises en avant restent présentes dans leur compétition.
- Exports événementiels sans plafond de dix résultats ou de deux matchs par compétition.
- Favoris équipe/compétition via les étoiles dans les détails de chaque carte. Ils sont conservés dans le navigateur et prioritaires dans les trois mises en avant, sans éliminer les autres événements de l'agenda. Ils ne sont pas synchronisés entre appareils.
- Groupes sportifs repliés conservés lors des changements de filtre pendant la session.
- Programmes génériques : libellé précis de compétition, proximité horaire, couverture du coup d'envoi et candidat unique correspondant au match traité. Refus en cas d'ambiguïté.
- Golf : résultats PGA et LPGA indépendants ; une source partiellement indisponible est signalée.

## Vérification avec les données locales du 5 septembre

- Schalke / Bayern : beIN Sports 2, 18h30, direct probable.
- Pologne / Italie féminin : L’Équipe, 18h, direct probable ; correspondance explicite du championnat féminin.
- Metz / Rodez : suppression des chaînes incorrectes de soirée ; diffuseur encore non identifié.
- Leverkusen / Union Berlin : suppression du programme de 18h30 attribué à tort.
- Tennis : aucune clé payante requise ; XMLTV sélectionne les tournois diffusés et ESPN fournit une synthèse ATP Hommes et une WTA Femmes avec tous les matchs/horaires en sous-titre.

Ces associations restent des déductions XMLTV, pas une confirmation externe de diffusion.

## Prochaine validation

Choisir Journée complète et comparer les matchs par compétition, puis Soirée pour vérifier les exclusions temporelles. Tester une étoile équipe et une étoile compétition, recharger la page pour vérifier leur conservation. Signaler uniquement absences réelles, chaînes incorrectes et faux directs.

À approfondir ensuite : catalogue Tennis, fiabilité des horaires Golf/athlétisme multi-jours, normalisation des noms courts des clubs, sélection enrichie par les classements. Le nombre de rapprochements ne constitue pas une mesure de justesse.
