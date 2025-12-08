# Contexte du Projet - TiboFlux

> **IMPORTANT** : Après avoir lu ce fichier, lire obligatoirement `conventions_code.md` qui contient les règles de code et le workflow "push now".

---

## Rappels pour la prochaine session

> **À lire EN PREMIER au démarrage et à afficher à l'utilisateur**

- [x] ~~Parler du fichier `exercices/cas-reels.md` (Cas Passation Sport Santé)~~

---

## Historique des Sessions

### Session 2025-12-08 (dernière) ✅

**Thème** : Swimlanes - Diagrammes multi-acteurs

**Réalisé :**
- ✅ **Implémentation complète des Swimlanes (Module 5.2)**
  - Lexer : nouveaux tokens `SWIMLANE`, `ACTORS`, `COLON`
  - Parser : AST pour swimlanes avec acteurs, références, connexions inter-acteurs
  - Renderer : `SwimlaneRenderer` avec colonnes verticales par acteur
- ✅ **Colonnes dynamiques** : largeur ajustée automatiquement selon le nombre de branches
  - Si un acteur a des branches parallèles, sa colonne s'élargit
  - Les nœuds restent à taille normale (160px) même avec plusieurs branches
- ✅ **Template swimlane** ajouté dans l'éditeur ("Nouveau" → "Swimlanes")
  - Migration automatique pour bases existantes
  - Support complet dans l'UI (icône 👥, détection du type)
- ✅ 88 tests passent (18 nouveaux tests swimlanes)

**Syntaxe Swimlane :**
```
swimlane "Titre du processus"

actors
  | Acteur1 | Acteur2 | Acteur3 |

Acteur1: {Action}
Acteur1: {Action} -> Acteur2: {Autre action}
Acteur2: <Decision?>
  | A -> [Option A]
  | B -> [Option B]
```

### Session 2025-12-07 ✅

**Thème** : Améliorations UX - Onglets, Aide syntaxe, Confirmation sauvegarde

**Réalisé :**
- ✅ Onglets Code/Contexte dans l'éditeur
  - Permet d'associer un contexte métier à chaque document
  - Champ `context` ajouté en base de données SQLite
- ✅ Modale Aide syntaxe (bouton "? Aide syntaxe")
  - Documentation complète : flowcharts + tableaux
  - Modificateurs :c2, :r2, :al, :ac, :ar
- ✅ Confirmation avant écrasement lors de la sauvegarde
  - Si document modifié : choix écraser / créer copie
  - Possibilité de renommer la copie
- ✅ Fix lexer : caractères Unicode (É majuscule), tirets, signe +
- ✅ Fix alignements tableaux (modificateurs :al, :ac, :ar)
- ✅ 70 tests passent

**Session précédente (matin)** :
- ✅ Coloration syntaxique (CodeMirror) avec mode custom TiboFlux
- ✅ Raccourci Ctrl+S pour sauvegarder
- ✅ Modales : Nouveau, Ouvrir, Exporter

### Session 2025-12-06 ✅

**Thème** : Tableaux Phase 2 + Persistance SQLite

**Réalisé :**
- ✅ Export tableaux : ASCII art, Markdown, HTML (19 tests)
- ✅ Persistance SQLite : documents sauvegardés en base
- ✅ Templates : 6 templates prédéfinis (3 flowcharts, 3 tableaux)
- ✅ UI éditeur : Nouveau/Ouvrir/Sauvegarder/Supprimer
- ✅ Fix renderer : normalisation headers pour tableaux simples
- ✅ Fix CSS : aperçu SVG aligné en haut (plus de troncature)

### Prochaine session - TODO

**Thème suggéré** : Cas réels ARS avec swimlanes

**Tâches prévues :**
- [ ] Créer le swimlane complet du cas Passation Sport Santé
- [ ] Créer les 2 tableaux associés :
  1. "Ce que comprend le portail" (glossaire)
  2. "Les scénarios possibles" (comparatif A/B1/B2)
- [ ] Ajouter la syntaxe swimlane dans l'aide syntaxe de l'éditeur

---

## Vue d'ensemble

Application de **génération de diagrammes de flux** avec un DSL (Domain Specific Language) custom. Le projet combine apprentissage théorique (standards de représentation de flux) et pratique (création d'un parser, rendu SVG, exports).

## Objectif

Créer un générateur de diagrammes moderne et éducatif :
- **DSL custom "TiboFlux"** : syntaxe intuitive pour décrire des flux
- **Lexer/Parser maison** : apprentissage complet du parsing (tokenisation → AST)
- **Rendu SVG** : génération programmatique de diagrammes vectoriels
- **Exports multiples** : SVG, PNG, PDF via Puppeteer
- **Interface web** : éditeur temps réel avec aperçu

## Vision

Un projet d'apprentissage couvrant :
- **Théorie des langages** : conception de DSL, grammaires, parsing
- **Standards de diagrammes** : Flowcharts, UML Activity, BPMN simplifié
- **Bonnes pratiques** : architecture modulaire, tests, séparation des responsabilités

## Stack Technique

- **Backend** : Node.js + Express
- **Template Engine** : Pug
- **Styling** : Tailwind CSS
- **Rendu** : SVG généré programmatiquement
- **Export PDF/PNG** : Puppeteer
- **Tests** : Jest

## Structure du Projet

```
tibo-flux/
├── src/
│   ├── server.js              # Serveur Express principal
│   ├── routes/
│   │   ├── index.js           # Route dashboard
│   │   ├── editor.js          # Route éditeur
│   │   ├── cours.js           # Route cours (standards de diagrammes)
│   │   └── api.js             # API REST (parse/render/export)
│   ├── services/
│   │   ├── lexer.js           # Tokenisation du DSL
│   │   ├── parser.js          # Génération AST
│   │   ├── renderer.js        # Rendu SVG
│   │   ├── exporter.js        # Export PNG/PDF via Puppeteer
│   │   └── diagramService.js  # Orchestration des services
│   └── views/
│       ├── layouts/
│       │   └── layout.pug     # Layout de base
│       └── pages/
│           ├── dashboard.pug  # Page d'accueil avec doc syntaxe
│           ├── editor.pug     # Éditeur avec aperçu temps réel
│           ├── cours.pug      # Cours sur les standards de diagrammes
│           ├── 404.pug        # Page non trouvée
│           └── error.pug      # Page d'erreur
├── public/
│   └── assets/
│       └── css/
│           ├── style.css      # Source Tailwind
│           └── output.css     # CSS compilé
├── tests/
│   └── unit/
│       ├── lexer.test.js      # Tests du lexer (12 tests)
│       ├── parser.test.js     # Tests du parser (10 tests)
│       └── renderer.test.js   # Tests du rendu (9 tests)
├── outputs/                   # Diagrammes exportés
├── tools/                     # Tailwind executable (à ajouter)
├── .env                       # PORT=3002
├── .env.example
├── .gitignore
├── .vscode/settings.json
├── jest.config.js
├── tailwind.config.js
├── package.json
└── contexte.md                # CE FICHIER
```

## Syntaxe du DSL TiboFlux

### Déclaration du flux
```
flow "Nom du processus"
```

### Types de nœuds

| Syntaxe | Type | Forme SVG | Usage |
|---------|------|-----------|-------|
| `[Texte]` | Terminal | Rectangle arrondi | Début/Fin |
| `{Texte}` | Process | Rectangle | Action/Traitement |
| `<Texte?>` | Decision | Losange | Condition/Branchement |
| `(Texte)` | I/O | Parallélogramme | Entrée/Sortie |

### Connexions
```
[A] -> [B]              # Flèche simple
[A] --> [B]             # Flèche longue (identique)
[A] -> "label" -> [B]   # Flèche avec étiquette
```

### Branches conditionnelles
```
<Disponible?>
  | oui -> {Action1} -> [Fin]
  | non -> {Action2} -> [Fin]
```

### Commentaires
```
# Ceci est un commentaire
```

### Tableaux ✅
```
table "Titre du tableau"
  | header | Colonne 1 | Colonne 2 | Colonne 3 |
  | Ligne 1 | Valeur | Valeur | Valeur |
  | Ligne 2 | Valeur | Valeur | Valeur |
```

**Fonctionnalités actuelles :**
- En-têtes en gras + fond coloré
- Bordures visibles
- Alternance de couleurs pour les lignes
- En-têtes multiples (plusieurs lignes `| header |...`)
- Colspan avec `:cN` (ex: `| Catégorie:c2 |`)
- Rowspan avec `:rN` (ex: `| Valeur:r3 |`)
- Cellules couvertes marquées `-`

**Exemple avec colspan/rowspan :**
```
table "Tableau complexe"
  | header | Catégorie:c2 | Info |
  | header | Sous-cat 1 | Sous-cat 2 | Détail |
  | Ligne 1 | A:r2 | X | 1 |
  | Ligne 2 | - | Y | 2 |
```

**Formats d'export prévus (Phase 2) :**
- SVG ✅ (par défaut)
- JSON ✅ (AST)
- ASCII art (`┌─┬─┐`) - à venir
- Markdown - à venir
- HTML - à venir

### Swimlanes ✅

Diagrammes multi-acteurs avec colonnes verticales par acteur :

```
swimlane "Titre du processus"

actors
  | Acteur1 | Acteur2 | Acteur3 |

Acteur1: {Action}
Acteur1: {Action} -> Acteur2: {Valide}
Acteur2: {Valide} -> Acteur3: <Decision?>
Acteur3: <Decision?>
  | A -> [Option A]
  | B -> [Option B]
```

**Fonctionnalités :**
- Colonnes verticales pour chaque acteur
- Connexions entre acteurs avec flèches traversantes
- Support des branches conditionnelles par acteur
- Colonnes dynamiques (s'élargissent si branches parallèles)
- Tous les types de nœuds supportés (terminal, process, decision, I/O)

### Exemple complet
```
# Processus de commande e-commerce
flow "Commande"

[Début] -> {Vérifier stock}

{Vérifier stock} -> <Disponible?>

<Disponible?>
  | oui -> {Traiter paiement} -> {Expédier} -> [Fin]
  | non -> {Notifier client} -> [Fin]
```

## Routes de l'Application

### Pages
- **`GET /`** : Dashboard avec documentation de la syntaxe
- **`GET /cours`** : Cours sur les standards de diagrammes (Flowchart, UML, BPMN)
- **`GET /editor`** : Éditeur avec aperçu temps réel

### API
- **`POST /api/parse`** : Parse le code TiboFlux → retourne l'AST (JSON)
- **`POST /api/render`** : Parse + Render → retourne le SVG
- **`POST /api/export`** : Parse + Render + Export → retourne URL du fichier

## Architecture Technique

### Pipeline de traitement

```
Code TiboFlux → Lexer → Tokens → Parser → AST → Renderer → SVG
                                                    ↓
                                              Exporter → PNG/PDF
```

### 1. Lexer (`src/services/lexer.js`)

Transforme le code source en tokens :

```javascript
TokenType = {
  FLOW,           // Mot-clé "flow"
  TERMINAL,       // [texte]
  PROCESS,        // {texte}
  DECISION,       // <texte?>
  IO,             // (texte)
  ARROW,          // -> ou -->
  PIPE,           // |
  STRING,         // "texte"
  IDENTIFIER,     // mot simple
  COMMENT,        // # commentaire
  NEWLINE, INDENT, DEDENT, EOF
}
```

### 2. Parser (`src/services/parser.js`)

Transforme les tokens en AST (Abstract Syntax Tree) :

```javascript
{
  type: "Flowchart",
  name: "Commande",
  nodes: [
    { type: "Terminal", id: "node_0", text: "Début" },
    { type: "Process", id: "node_1", text: "Vérifier stock" },
    // ...
  ],
  connections: [
    { type: "Connection", from: "node_0", to: "node_1", label: null },
    // ...
  ]
}
```

### 3. Renderer (`src/services/renderer.js`)

Génère le SVG à partir de l'AST :
- **LayoutEngine** : calcule les positions des nœuds (algorithme par niveaux)
- **SVGRenderer** : génère le markup SVG (formes, flèches, textes)

### 4. Exporter (`src/services/exporter.js`)

Exporte le SVG en différents formats :
- **SVG** : sauvegarde directe du fichier
- **PNG/PDF** : via Puppeteer (headless Chrome)

## État Actuel

### Ce qui fonctionne ✅

- **Lexer complet** : tokenisation de tous les éléments de la syntaxe (flowcharts + tableaux)
- **Parser fonctionnel** : génération de l'AST avec nœuds, connexions, et tableaux
- **Branches conditionnelles** : parsing correct des branches `| label -> ...` avec labels "oui"/"non"
- **Tableaux complets (Phase 1 + 3)** :
  - Syntaxe `table "Titre"` + lignes `| cell | cell |`
  - En-têtes multiples avec mot-clé `header`
  - Colspan (`:cN`) et Rowspan (`:rN`) fonctionnels
  - Rendu SVG avec fusion de cellules
- **Rendu SVG** :
  - Formes correctes (terminal arrondi, process rectangulaire, decision losange, I/O parallélogramme)
  - Flèches avec markers
  - Labels sur les connexions
  - Titre du diagramme
  - Layout automatique par niveaux (DFS avec niveau max)
  - Tableaux avec en-têtes colorés, bordures, alternance de couleurs
- **Export** : SVG, PNG, PDF, JSON (AST)
- **Interface web** :
  - Dashboard avec documentation
  - Éditeur avec textarea
  - Aperçu SVG (responsive, scrollable)
  - Console de debug
  - Boutons Parse/Générer/Exporter (dropdown avec JSON)
- **Tests** : 50 tests passent (lexer, parser, renderer avec tableaux et colspan/rowspan)
- **Serveur** : Express sur port 3002

### Ce qui ne fonctionne pas encore ❌

- **Coloration syntaxique** : l'éditeur est un simple textarea sans highlighting
- **Tailwind CLI** : `tailwindcss.exe` n'est pas inclus (à copier depuis un autre projet)
- **Tableaux Phase 2** : Exports ASCII art, Markdown, HTML (à venir)

### En cours de développement 🚧

#### UX Production vs Apprentissage
- **Décision prise** : Séparer `/editor` (production) de `/cours` (apprentissage)
- **À faire** : Épurer l'éditeur (masquer/simplifier la console, bouton Parser)
- **À faire** : Enrichir `/cours` avec des exemples interactifs et outils de debug

### Limitations connues

- Pas de support BPMN complet (events, gateways complexes)
- Pas de drag & drop pour repositionner les nœuds

## Discussions et Décisions

### Choix de la syntaxe DSL (Décembre 2024)

**Contexte** : Trois approches ont été envisagées pour la syntaxe textuelle.

**Options évaluées** :

1. **Style Mermaid** : `A --> B`, `graph TD`
   - Avantage : Standard, documenté
   - Inconvénient : Moins flexible pour l'apprentissage

2. **Style PlantUML** : `@startuml`, `:action;`
   - Avantage : Très puissant
   - Inconvénient : Nécessite serveur Java

3. **DSL custom** ✅ **[CHOISI]**
   - Avantage : Contrôle total, apprentissage complet du parsing
   - Inconvénient : Pas de communauté existante

**Décision** : DSL custom avec syntaxe inspirée des symboles standards :
- `[...]` pour terminaux (visuellement "encadré")
- `{...}` pour process (visuellement "bloc")
- `<...>` pour décisions (visuellement "pointe")
- `(...)` pour I/O (visuellement "arrondi")

### Types de diagrammes supportés

**Phase actuelle** : Flowcharts classiques uniquement

**Prévu pour plus tard** :
- Diagrammes d'activité UML (swimlanes, fork/join)
- Workflows BPMN simplifiés (events, gateways)

## Démarrage de l'Application

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. (Optionnel) Copier tailwindcss.exe dans tools/
# Télécharger depuis https://github.com/tailwindlabs/tailwindcss/releases
```

### Lancement

```bash
# Mode développement (avec watch)
npm run dev

# Mode production
npm start

# Tests
npm test
```

Application accessible sur **http://localhost:3002**

## Tests

### Exécuter les tests

```bash
npm test          # Tous les tests
npm run test:watch  # Mode watch
```

### Tests inclus (31 tests)

#### lexer.test.js (12 tests)
- Tokens de base : chaîne vide, mot-clé flow, commentaires
- Nœuds : terminal, process, decision, I/O
- Connexions : flèche simple, flèche longue, pipe
- Cas complexes : flowchart complet, caractères accentués

#### parser.test.js (10 tests)
- Structure : flowchart vide, nom du flow
- Nœuds : terminal, process, decision, I/O
- Connexions : simple, chaîne, réutilisation des nœuds
- Cas complexes : flowchart complet

#### renderer.test.js (9 tests)
- Structure SVG : validité, définitions de marqueurs
- Rendu nœuds : terminal arrondi, process rectangulaire, decision losange, I/O parallélogramme
- Connexions : flèches avec markers
- Titre : affichage du nom
- Sécurité : échappement XML

## Parcours d'Apprentissage

Ce projet est conçu comme un **outil d'apprentissage** pour comprendre :
- La conception de DSL (Domain Specific Language)
- Le parsing (lexer → tokens → parser → AST)
- Le rendu SVG programmatique
- Les standards de diagrammes (Flowchart, UML, BPMN)

### Modules du Parcours

#### 🎯 Module 1 : Maîtriser l'existant (opérationnel)
- [x] **1.1** Les standards de diagrammes : Flowchart, UML Activity, BPMN - quand utiliser quoi
  - Page `/cours` créée avec documentation complète et interactive
- [ ] **1.2** La syntaxe TiboFlux actuelle : exercices pratiques avec des cas réels
- [ ] **1.3** Générer des diagrammes utiles pour les collègues

**Status** : 🟡 En cours

#### 🔤 Module 2 : Comprendre le Lexer (théorie légère)
- [ ] **2.1** Concept : Qu'est-ce qu'un lexer ? (tokenisation, expressions régulières)
- [ ] **2.2** Exercice : Lire et comprendre `lexer.js` ensemble
- [ ] **2.3** Pratique : Ajouter un nouveau type de token

**Status** : ⚪ À venir

#### 🌳 Module 3 : Comprendre le Parser (théorie légère)
- [ ] **3.1** Concept : Tokens → AST, grammaires, recursive descent
- [ ] **3.2** Exercice : Lire et comprendre `parser.js` ensemble
- [ ] **3.3** Pratique : Étendre la grammaire

**Status** : ⚪ À venir

#### 📐 Module 4 : Algorithmes de graphes (théorie légère)
- [ ] **4.1** Concepts : DFS/BFS, niveaux, layout de graphes
- [ ] **4.2** Exercice : Comprendre `renderer.js` et le LayoutEngine
- [ ] **4.3** Pratique : Améliorer le layout (éviter les croisements, swimlanes...)

**Status** : ⚪ À venir

#### 🚀 Module 5 : Nouvelles notations (extension)
- [ ] **5.1** BPMN simplifié : events, gateways
- [ ] **5.2** Swimlanes : acteurs en colonnes
- [ ] **5.3** Autres notations selon besoins

**Status** : ⚪ À venir

---

## Prochaines Étapes Possibles

### Court terme
- [x] Corriger le parsing des branches conditionnelles
- [x] Améliorer le layout pour éviter les chevauchements (DFS avec niveau max)
- [ ] Ajouter la coloration syntaxique (CodeMirror mode custom)
- [ ] Copier tailwindcss.exe et configurer le build CSS

### Moyen terme
- [ ] Support des swimlanes (acteurs en colonnes)
- [ ] Sauvegarde des diagrammes en base de données
- [ ] Import/export de fichiers .tiboflux
- [ ] Thèmes de couleurs personnalisables

### Long terme
- [ ] Éditeur visuel drag & drop
- [ ] Collaboration temps réel
- [ ] Support BPMN complet
- [ ] Parser hybride (multi-syntaxe)

## Ressources Théoriques

### Standards de diagrammes
- **ISO 5807** : Symboles de traitement de l'information
- **UML 2.5** : Activity Diagrams
- **BPMN 2.0** : Business Process Model and Notation

### Parsing et langages
- **Lexical Analysis** : Tokenisation, expressions régulières
- **Syntax Analysis** : Grammaires, AST, recursive descent parsing
- **Code Generation** : Transformation AST → output

### Références
- [Crafting Interpreters](https://craftinginterpreters.com/) - Livre gratuit sur le parsing
- [Mermaid.js](https://mermaid.js.org/) - Inspiration pour la syntaxe
- [Graphviz DOT](https://graphviz.org/doc/info/lang.html) - Langage de description de graphes

---

**Dernière mise à jour** : 2025-12-08
**Version** : 1.7.0
**Status** : MVP fonctionnel - Swimlanes complets, 88 tests
