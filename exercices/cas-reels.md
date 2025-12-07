# Cas Réels - Exercices TiboFlux

> Ce fichier documente les cas réels utilisés pour les exercices pratiques du Module 1.
> Il permet de conserver le contexte entre les sessions.

---

## Cas 1 : Passation Portail Sport Santé

### Contexte général

**Le portail Sport Santé** est un site web de référencement d'offres d'Activité Physique Adaptée (APA) géolocalisée en Occitanie.

**Objectif du portail** : Mettre en relation :
- Les **médecins prescripteurs** (qui prescrivent l'APA)
- Les **professionnels** (kinés, éducateurs sportifs) qui donnent des cours adaptés
- Les **patients/bénéficiaires** atteints de pathologies et intéressés par une activité physique

### La passation

**Nature** : Transfert de responsabilité du portail (tout ou partie) vers un prestataire externe.

**Enjeux** :
- Transfert de responsabilité
- Changement de prestataire
- Formation/transmission de connaissances

**Deadline** : Réunion de présentation fin janvier 2025, passation prévue T1/S1 2026.

### Acteurs impliqués

| Acteur | Rôle | Profil |
|--------|------|--------|
| **Thibaud** (moi) | Dev FullStack, porteur actuel | Technique |
| **Collègue cheffe de projet** | Pilotage projet | Non technique |
| **Prestataire externe** | Futur repreneur (inconnu) | À déterminer |
| **ARS Occitanie** | Financeur, décisionnel | Non technique, "susceptible et bordélique" |

### Scénarios à modéliser

**Objectif** : Présenter tous les cas de figure possibles à l'ARS pour clarifier leur demande (ils ne savent pas exactement ce qu'ils veulent car ils ne maîtrisent pas les aspects techniques).

**Types de scénarios à explorer** :
- [ ] Passation complète (tout le portail)
- [ ] Passation partielle (quelles parties ?)
- [ ] Variantes selon le niveau technique du prestataire
- [ ] Variantes selon le périmètre (hébergement, maintenance, évolutions, support...)

### Questions à clarifier

1. Que comprend exactement "le portail" ? (code, données, hébergement, nom de domaine, support utilisateurs...)
2. Quelles compétences techniques sont requises pour le repreneur ?
3. Quel niveau d'accompagnement pendant la transition ?
4. Qui assure le support pendant la période de transition ?
5. Quels sont les risques de chaque scénario ?

### Livrables attendus

Pour la réunion de fin janvier :
- [ ] Tableau comparatif des scénarios
- [ ] Flowchart du processus de passation
- [ ] Liste des prérequis pour chaque scénario

---

## Documentation ARS (version vulgarisée)

> Cette section contient la version non-technique pour présentation à l'ARS.

### Ce que comprend "le portail"

| # | Élément | Ce que ça veut dire |
|---|---------|---------------------|
| 1 | Le portail lui-même | Le site internet visible par les utilisateurs |
| 2 | Les données | Toutes les informations enregistrées (offres, professionnels, etc.) |
| 3 | L'hébergement | L'espace où le portail "vit" sur internet |
| 4 | L'adresse internet | Le nom du portail (occitanie-sport-sante.fr) |
| 5 | L'assistance utilisateurs | Répondre aux questions des utilisateurs |
| 6 | Les corrections | Réparer les problèmes quand il y en a |
| 7 | Les améliorations | Ajouter de nouvelles fonctionnalités |

### Les scénarios possibles

| Scénario | Ce qui est transféré | Ce que le CREAI garde | Type de prestataire à trouver |
|----------|---------------------|----------------------|------------------------------|
| **A** | Tout | Rien | Prestataire autonome |
| **B1** | Tout sauf l'adresse internet | L'adresse internet | Prestataire autonome |
| **B2** | Le portail + assistance + corrections + améliorations | L'adresse internet + l'hébergement | Prestataire moins spécialisé possible |

### Pendant la transition

- **Documentation** : Des guides détaillés seront fournis au prestataire
- **Formation** : Une formation pourra être demandée par le prestataire
- **Qui gère les urgences ?** : Le CREAI, jusqu'à ce que le prestataire confirme avoir tout reçu
- **Point de validation** : Réunion ARS une fois le transfert effectué

---

## Documentation technique (pour l'externe / historisation)

> Cette section contient les détails techniques. Ne pas utiliser pour l'ARS.

### Les "morceaux" du portail transférables

| # | Morceau | Responsable actuel | Notes |
|---|---------|-------------------|-------|
| 1 | Code source / application | Thibaud | WordPress (PHP/MySQL) |
| 2 | Base de données / contenu | Thibaud | MySQL |
| 3 | Hébergement (serveur) | Thibaud | |
| 4 | Nom de domaine | Thibaud | |
| 5 | Support utilisateurs (helpdesk) | Thibaud | |
| 6 | Maintenance corrective (bugs) | Thibaud | |
| 7 | Évolutions fonctionnelles | Thibaud | |

**Contrainte technique** : Application WordPress → problématique de migration PHP/MySQL à prévoir

### Scénarios et prérequis techniques

#### Scénario A - Passation complète

> Le repreneur récupère tout (code, BDD, hébergement, domaine, support, maintenance, évolutions)

| Prérequis | Niveau |
|-----------|--------|
| WordPress | Maîtrise (thèmes, plugins, config) |
| PHP/MySQL | Dev confirmé (debug, modifs custom) |
| Hébergement | Autonome (serveur, SSL, sauvegardes) |
| Support utilisateurs | Capable de répondre aux demandes |

**Profil minimum** : Agence web ou dev PHP confirmé + expérience sysadmin

#### Scénario B1 - Thibaud garde le nom de domaine

> Pareil que A, mais le domaine reste chez Thibaud (gestion DNS)

| Prérequis | Niveau |
|-----------|--------|
| Idem Scénario A | |
| + Coordination DNS | Savoir demander un pointage DNS |

**Profil minimum** : Idem A
**Risque** : Dépendance vers Thibaud pour le domaine (renouvellement, changement DNS)

#### Scénario B2 - Thibaud garde domaine + hébergement

> Le repreneur ne gère que le code WordPress + support/maintenance/évolutions

| Prérequis | Niveau |
|-----------|--------|
| WordPress | Maîtrise |
| PHP/MySQL | Intermédiaire (pas besoin de gérer l'infra) |
| Hébergement | Aucun (Thibaud gère) |

**Profil minimum** : Dev PHP intermédiaire ou agence web
**Avantage** : Plus facile à trouver, moins de risques de plantage serveur
**Risque** : Thibaud reste impliqué (hébergement = responsabilité)

### Transition

- **Formation** : Courte, basée sur docs de procédure détaillées
- **Passation de connaissances** : Documentation des procédures (peu de choses, mais bien détaillées)
- **Urgences pendant transition** : Gérées par Thibaud jusqu'à confirmation de réception des livrables par l'externe
- **Point ARS** : À la confirmation de réception des livrables

---

## Cas 2 : (À venir)

*Ajouter d'autres cas réels ici au fil des sessions*

---

**Dernière mise à jour** : 2025-12-07
