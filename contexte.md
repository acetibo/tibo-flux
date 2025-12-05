# Contexte du Projet - TiboFlux

> **IMPORTANT** : Après avoir lu ce fichier, lire obligatoirement `conventions_code.md` qui contient les règles de code et le workflow "push now".

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

- **Lexer complet** : tokenisation de tous les éléments de la syntaxe
- **Parser fonctionnel** : génération de l'AST avec nœuds et connexions
- **Branches conditionnelles** : parsing correct des branches `| label -> ...` avec labels "oui"/"non"
- **Rendu SVG** :
  - Formes correctes (terminal arrondi, process rectangulaire, decision losange, I/O parallélogramme)
  - Flèches avec markers
  - Labels sur les connexions
  - Titre du diagramme
  - Layout automatique par niveaux (DFS avec niveau max)
- **Export** : SVG, PNG, PDF via Puppeteer
- **Interface web** :
  - Dashboard avec documentation
  - Éditeur avec textarea
  - Aperçu SVG (responsive, scrollable)
  - Console de debug
  - Boutons Parse/Générer/Exporter
- **Tests** : 31 tests passent (lexer, parser, renderer)
- **Serveur** : Express sur port 3002

### Ce qui ne fonctionne pas encore ❌

- **Coloration syntaxique** : l'éditeur est un simple textarea sans highlighting
- **Tailwind CLI** : `tailwindcss.exe` n'est pas inclus (à copier depuis un autre projet)

### Limitations connues

- Pas de support des swimlanes (diagrammes d'activité UML)
- Pas de support BPMN (events, gateways complexes)
- Pas de drag & drop pour repositionner les nœuds
- Pas de sauvegarde des diagrammes en base de données

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

**Dernière mise à jour** : 2025-12-05
**Version** : 1.1.0
**Status** : MVP fonctionnel - Branches conditionnelles et layout corrigés
