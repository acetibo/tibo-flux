# Conventions de Code du Projet TiboFlux

> **Pour tous les contributeurs** : Ce document contient les conventions de code et directives techniques critiques du projet. Ces règles s'appliquent à tous les développeurs et assistants pour garantir la qualité, la cohérence et la maintenabilité du code.

## Table des Matières
- [Philosophie : "Opérationnel First"](#philosophie--opérationnel-first)
- [Règle #1 : Conflit Pug / Tailwind CSS](#règle-1--conflit-pug--tailwind-css)
- [Règle #2 : Architecture du DSL TiboFlux](#règle-2--architecture-du-dsl-tiboflux)
- [Règle #3 : Bonnes Pratiques Puppeteer](#règle-3--bonnes-pratiques-puppeteer)
- [Règle #4 : Gestion du Serveur lors des Tests](#règle-4--gestion-du-serveur-applicatif-lors-des-tests)
- [Règle #5 : Bonnes Pratiques de Débogage](#règle-5--bonnes-pratiques-de-débogage)
- [Raccourcis Syntaxiques](#raccourcis-syntaxiques)
- [Extensions Futures](#extensions-futures)

---

## Philosophie : "Opérationnel First"

### Principe Fondamental

**"Opérationnel First"** signifie **toujours privilégier la solution la plus simple qui fonctionne immédiatement**, puis itérer pour améliorer si nécessaire. Cette approche pragmatique maximise la valeur livrée rapidement tout en permettant l'évolution progressive du système.

### Les 3 Piliers

#### 1. Simple > Parfait
- ✅ Choisir la solution la plus simple qui répond au besoin
- ✅ Éviter la sur-ingénierie et l'optimisation prématurée
- ✅ Préférer une implémentation basique fonctionnelle à une architecture élaborée non testée
- ❌ Ne PAS créer des abstractions "au cas où"
- ❌ Ne PAS ajouter des fonctionnalités anticipées

**Exemple TiboFlux** : Le lexer utilise des expressions régulières simples plutôt qu'un générateur de parser (ANTLR, PEG.js). Plus facile à comprendre et modifier.

#### 2. Itératif > Big Bang
- ✅ Livrer des incréments fonctionnels fréquents
- ✅ Tester rapidement avec l'utilisateur
- ✅ Valider chaque étape avant d'ajouter de la complexité
- ❌ Ne PAS développer pendant des semaines sans validation
- ❌ Ne PAS créer une architecture complète avant le premier test

**Exemple TiboFlux** : Lexer → Parser → Renderer SVG → Export PNG/PDF (progressif)

#### 3. Valeur Utilisateur > Élégance Technique
- ✅ Prioriser ce qui apporte de la valeur immédiate
- ✅ Accepter temporairement de la "dette technique" si nécessaire
- ✅ Documenter les simplifications pour amélioration future
- ❌ Ne PAS bloquer une fonctionnalité pour perfectionner le code
- ❌ Ne PAS sacrifier la livraison pour l'élégance architecturale

**Exemple TiboFlux** : Layout par niveaux simple plutôt qu'un algorithme de graphe complexe (Dagre, ELK).

### Exemples d'Application dans ce Projet

| Besoin | ❌ Approche Complexe | ✅ Approche "Opérationnel First" |
|--------|---------------------|----------------------------------|
| Parser DSL | Générateur ANTLR/PEG.js | Lexer/Parser maison en JS |
| Layout diagramme | Bibliothèque Dagre/ELK | Algorithme par niveaux simple |
| Rendu | Canvas avec bibliothèque | SVG généré programmatiquement |
| Export PDF | Bibliothèque PDF complexe | Puppeteer (screenshot/print) |
| Syntaxe DSL | Multi-format hybride | DSL custom unique |

---

## Règle #1 : Conflit Pug / Tailwind CSS

### Problème Critique

**Pug interprète le caractère `:` comme un indicateur de filtre**, ce qui entre en conflit avec les classes Tailwind contenant des modificateurs (comme `hover:`, `focus:`, `md:`, `lg:`, etc.).

### ❌ INTERDIT - Ne JAMAIS faire :

```pug
// Syntaxe incorrecte - provoque une erreur Pug
a.text-gray-600.hover:text-blue-600(href="/") Lien
div.grid.grid-cols-1.md:grid-cols-2 Contenu
input.border.focus:ring-2
button.bg-blue-600.hover:bg-blue-700.disabled:opacity-50
```

### ✅ OBLIGATOIRE - Toujours faire :

```pug
// Syntaxe correcte - utiliser l'attribut class entre parenthèses
a(class="text-gray-600 hover:text-blue-600" href="/") Lien
div(class="grid grid-cols-1 md:grid-cols-2") Contenu
input(class="border focus:ring-2 focus:ring-blue-500")
button(class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50")
```

### Règle Absolue

- **Dès qu'une classe Tailwind contient un `:`, elle DOIT être placée dans `class="..."` entre parenthèses**
- Les classes sans `:` PEUVENT utiliser la notation Pug raccourcie (`.ma-classe`)
- **En cas de doute, TOUJOURS utiliser `class="..."` pour les classes Tailwind complexes**

### Checklist de Validation Pug/Tailwind

**Avant de considérer une tâche terminée impliquant des fichiers `.pug` :**

- [ ] Aucune classe Tailwind avec `:` en notation raccourcie (`.classe:modif`)
- [ ] Toutes les classes avec modificateurs sont dans `class="..."`
- [ ] Recherche grep effectuée : `grep -E "\.[a-z-]+:[a-z-]+" src/views/**/*.pug`
- [ ] Serveur testé sans erreur de parsing Pug

---

## Règle #2 : Architecture du DSL TiboFlux

### Pipeline de Traitement

```
Code TiboFlux → Lexer → Tokens → Parser → AST → Renderer → SVG
                                                    ↓
                                              Exporter → PNG/PDF
```

### Conventions du Lexer (`src/services/lexer.js`)

#### Types de Tokens

```javascript
const TokenType = {
  // Mots-clés
  FLOW: 'FLOW',           // Déclaration du flux

  // Nœuds (délimiteurs spécifiques)
  TERMINAL: 'TERMINAL',   // [texte] - début/fin
  PROCESS: 'PROCESS',     // {texte} - action
  DECISION: 'DECISION',   // <texte?> - condition
  IO: 'IO',               // (texte) - entrée/sortie

  // Connexions
  ARROW: 'ARROW',         // -> ou -->
  PIPE: 'PIPE',           // | pour branches

  // Littéraux
  STRING: 'STRING',       // "texte"
  IDENTIFIER: 'IDENTIFIER',

  // Structure
  NEWLINE, INDENT, DEDENT, COMMENT, EOF
};
```

#### Règles de Tokenisation

1. **Les nœuds sont délimités par des caractères spécifiques** :
   - `[...]` pour Terminal
   - `{...}` pour Process
   - `<...>` pour Decision
   - `(...)` pour I/O

2. **Les espaces dans les nœuds sont préservés** :
   ```
   {Vérifier le stock}  →  Token(PROCESS, "Vérifier le stock")
   ```

3. **Les caractères accentués sont supportés** :
   ```
   [Début] → Token(TERMINAL, "Début")
   ```

### Conventions du Parser (`src/services/parser.js`)

#### Structure de l'AST

```javascript
{
  type: "Flowchart",
  name: "Nom du flux",
  nodes: [
    { type: "Terminal", id: "node_0", text: "Début" },
    { type: "Process", id: "node_1", text: "Action" },
    // ...
  ],
  connections: [
    { type: "Connection", from: "node_0", to: "node_1", label: null },
    // ...
  ]
}
```

#### Règles de Parsing

1. **Réutilisation des nœuds** : Un nœud avec le même texte et type est réutilisé
   ```
   [Fin] → [Fin]  // Même instance dans l'AST
   ```

2. **Chaînes de connexions** : Parsées récursivement
   ```
   [A] -> {B} -> [C]  // Crée 2 connexions : A→B et B→C
   ```

3. **Labels de connexion** : Extraits des strings entre flèches
   ```
   [A] -> "oui" -> [B]  // Connection avec label "oui"
   ```

### Conventions du Renderer (`src/services/renderer.js`)

#### Layout

1. **Algorithme par niveaux** : Les nœuds sont positionnés verticalement par niveau de profondeur
2. **Centrage horizontal** : Les nœuds d'un même niveau sont centrés
3. **Espacement configurable** via `CONFIG` :
   ```javascript
   const CONFIG = {
     nodeWidth: 160,
     nodeHeight: 50,
     nodeSpacingX: 80,
     nodeSpacingY: 80,
     padding: 40
   };
   ```

#### Formes SVG

| Type | Forme | Caractéristique |
|------|-------|-----------------|
| Terminal | Rectangle | `rx` arrondi (bords arrondis) |
| Process | Rectangle | Coins droits |
| Decision | Losange | `<polygon>` avec 4 points |
| I/O | Parallélogramme | `<polygon>` avec décalage |

#### Couleurs

```javascript
colors: {
  terminal: { fill: '#e0e7ff', stroke: '#4f46e5' },
  process: { fill: '#dbeafe', stroke: '#2563eb' },
  decision: { fill: '#fef3c7', stroke: '#d97706' },
  io: { fill: '#d1fae5', stroke: '#059669' },
  arrow: { stroke: '#6b7280', fill: '#6b7280' }
}
```

### Tests du DSL

**Chaque modification du Lexer/Parser/Renderer doit être accompagnée de tests** :

```javascript
// Exemple de test lexer
test('tokenize un nœud terminal [...]', () => {
  const tokens = tokenize('[Début]');
  expect(tokens[0].type).toBe(TokenType.TERMINAL);
  expect(tokens[0].value).toBe('Début');
});

// Exemple de test parser
test('parse une connexion simple', () => {
  const ast = parseCode('[A] -> [B]');
  expect(ast.connections).toHaveLength(1);
  expect(ast.connections[0].from).toBe(ast.nodes[0].id);
});

// Exemple de test renderer
test('génère un SVG valide', () => {
  const svg = renderCode('[A]');
  expect(svg).toContain('<svg');
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
});
```

---

## Règle #3 : Bonnes Pratiques Puppeteer

### Problème : Méthodes dépréciées

Puppeteer évolue rapidement et certaines méthodes sont supprimées entre les versions. Il est **critique** de maintenir le code compatible avec les versions récentes.

### ❌ INTERDIT - Méthodes obsolètes :

```javascript
// ❌ Supprimé dans Puppeteer v21+
await page.waitForTimeout(1000);
```

### ✅ OBLIGATOIRE - Approches modernes :

```javascript
// ✅ Utiliser les Promises natives
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ Ou mieux : attendre un sélecteur spécifique
await page.waitForSelector('#elementId', { timeout: 5000 });

// ✅ Ou attendre une fonction
await page.waitForFunction(() => document.querySelector('svg') !== null);
```

### Configuration Puppeteer pour TiboFlux

```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

---

## Règle #4 : Gestion du Serveur Applicatif lors des Tests

### Problème : Multiples Instances du Serveur Pendant les Tests

Lors de l'exécution de tests Jest nécessitant un serveur actif, plusieurs instances du serveur peuvent être lancées.

### ✅ PROCÉDURE OBLIGATOIRE - Workflow de Tests

**Toujours suivre cette séquence lors de l'exécution de tests :**

1. **Couper le serveur applicatif AVANT de lancer les tests**
   ```bash
   # Arrêter le serveur en cours (npm run dev)
   ```

2. **Lancer les tests**
   ```bash
   npm test
   ```

3. **Redémarrer le serveur UNIQUEMENT à la fin**
   ```bash
   npm run dev
   ```

### Règle Générale

- **NE JAMAIS** laisser le serveur actif pendant l'exécution de `npm test`
- **Toujours** arrêter le serveur avant de lancer une suite de tests complète
- **Préférer** les tests unitaires qui n'ont pas besoin du serveur

---

## Règle #5 : Bonnes Pratiques de Débogage

### Débogage du Lexer

```javascript
// Afficher tous les tokens
const tokens = tokenize(code);
tokens.forEach(t => console.log(t.toString()));
// Output: Token(TERMINAL, "Début", 1:1)
```

### Débogage du Parser

```javascript
// Afficher l'AST formaté
const ast = parseCode(code);
console.log(JSON.stringify(ast, null, 2));
```

### Débogage du Renderer

```javascript
// Sauvegarder le SVG pour inspection
const svg = renderCode(code);
require('fs').writeFileSync('debug.svg', svg);
// Ouvrir debug.svg dans un navigateur
```

### Checklist de Débogage

- [ ] Vérifier les tokens générés par le lexer
- [ ] Vérifier la structure de l'AST
- [ ] Vérifier les positions calculées par le LayoutEngine
- [ ] Inspecter le SVG généré dans le navigateur (DevTools)
- [ ] Vérifier la console pour les erreurs JavaScript

---

## Raccourcis Syntaxiques

### Commande : "push now"

Lorsque l'utilisateur tape **"push now"**, exécuter automatiquement :

#### Étape 1 : Arrêter le serveur de développement (si actif)

#### Étape 2 : Exécuter les tests Jest
```bash
npm test
```

#### Étape 3A : Si TOUS les tests sont VERTS ✅

1. **Mettre à jour `contexte.md`** :
   - Actualiser la section "Ce qui fonctionne"
   - Mettre à jour le nombre de tests
   - Actualiser la version et la date
   - Documenter les nouvelles fonctionnalités

2. **Mettre à jour `conventions_code.md`** :
   - Ajouter de nouvelles règles si découvertes
   - Mettre à jour les "Leçons Apprises"

3. **Commit et Push** :
   ```bash
   git add .
   git commit -m "Message descriptif des changements"
   git push
   ```

4. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

#### Étape 3B : Si des tests sont ROUGES ❌

1. **Mettre à jour `contexte.md`** avec focus DÉBOGAGE :
   - Actualiser la section "Ce qui ne fonctionne pas"
   - Documenter les tests en échec (nom, message d'erreur)
   - Ajouter des hypothèses sur la cause
   - Lister les pistes de résolution

2. **Mettre à jour `conventions_code.md`** avec focus DÉBOGAGE :
   - Ajouter une entrée dans "Leçons Apprises" avec le contexte du bug
   - Documenter ce qui a été tenté et pourquoi ça n'a pas fonctionné

3. **NE PAS commit/push le code** :
   - ❌ Pas de `git add .`
   - ❌ Pas de `git commit`
   - ❌ Pas de `git push`
   - 🛑 Informer l'utilisateur que le push est **bloqué** jusqu'à correction

4. **Redémarrer le serveur** pour continuer le débogage :
   ```bash
   npm run dev
   ```

#### Exemple de sortie (tests verts)
```
✅ Commande "push now" exécutée :

1. Serveur arrêté
2. Tests Jest : 31/31 passés ✅
3. contexte.md mis à jour (v1.0.0 → v1.0.1)
4. conventions_code.md mis à jour
5. Commit : abc1234 "Add export functionality"
6. Push réussi vers origin/main
7. Serveur redémarré sur http://localhost:3002

📦 Total : 5 fichiers modifiés, 1 commit pushé
```

#### Exemple de sortie (tests rouges)
```
🛑 Commande "push now" - Tests en échec

1. Serveur arrêté
2. Tests Jest : 29/31 passés ❌

   ÉCHECS :
   - lexer.test.js > "tokenize les branches conditionnelles"
     Error: Expected PIPE token, got IDENTIFIER
   - parser.test.js > "parse un flowchart avec branches"
     Error: connections.length expected 4, got 2

3. contexte.md mis à jour (section débogage)
   - Ajouté : "Branches conditionnelles non parsées correctement"
   - Hypothèse : Le lexer ne détecte pas le | après indentation

4. conventions_code.md mis à jour (leçons apprises)

5. ❌ Push BLOQUÉ - Corriger les tests avant de pusher
6. Serveur redémarré pour débogage

⚠️ 2 tests à corriger avant push
```

---

## Extensions Futures

### À venir

- **Conventions pour les swimlanes** (diagrammes d'activité UML)
- **Conventions BPMN** (events, gateways)
- **Validation de la syntaxe DSL** (messages d'erreur clairs)
- **Conventions pour le layout** (algorithmes avancés)
- **Performance** (cache, lazy rendering)

---

## Leçons Apprises

### Session 2024-12-04

- **Choix du DSL custom** : Permet un apprentissage complet du parsing (lexer → parser → AST)
- **Architecture modulaire** : Lexer, Parser, Renderer, Exporter séparés = maintenabilité
- **SVG programmatique** : Plus flexible qu'une bibliothèque de graphes
- **Tests dès le début** : 31 tests garantissent la non-régression
- **Port configurable** : Via `.env` pour éviter les conflits (3002 au lieu de 3000)

---

**Dernière mise à jour** : 2024-12-04
**Version** : 1.0.0
