/**
 * Parser TiboFlux
 * Transforme les tokens en AST (Abstract Syntax Tree)
 */

const { TokenType } = require('./lexer');

// Types de nœuds dans l'AST
const NodeType = {
  FLOWCHART: 'Flowchart',
  TABLE: 'Table',
  SWIMLANE: 'Swimlane',
  TERMINAL: 'Terminal',
  PROCESS: 'Process',
  DECISION: 'Decision',
  IO: 'InputOutput',
  CONNECTION: 'Connection',
  BRANCH: 'Branch'
};

class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens.filter(t =>
      t.type !== TokenType.COMMENT &&
      t.type !== TokenType.NEWLINE
    );
    this.pos = 0;
    this.nodes = new Map(); // Stocke les nœuds par leur texte
    this.connections = [];
    this.swimlaneMode = false; // Mode swimlane actif
    this.currentActor = null; // Acteur courant pour les nœuds
    this.actors = []; // Liste des acteurs pour swimlanes
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || { type: TokenType.EOF };
  }

  advance() {
    return this.tokens[this.pos++];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  expect(type, message) {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`${message}. Attendu: ${type}, Reçu: ${token.type} (ligne ${token.line})`);
    }
    return this.advance();
  }

  match(...types) {
    const token = this.peek();
    if (types.includes(token.type)) {
      return this.advance();
    }
    return null;
  }

  // Crée ou récupère un nœud existant
  getOrCreateNode(type, text, actor = null) {
    // En mode swimlane, la clé inclut l'acteur pour permettre des actions identiques pour différents acteurs
    const actorForKey = this.swimlaneMode ? (actor || this.currentActor || 'unknown') : '';
    const key = this.swimlaneMode ? `${type}:${text}:${actorForKey}` : `${type}:${text}`;

    if (!this.nodes.has(key)) {
      const nodeProps = {
        id: `node_${this.nodes.size}`,
        text: text
      };

      // Ajoute l'acteur en mode swimlane
      if (this.swimlaneMode) {
        nodeProps.actor = actor || this.currentActor;
      }

      const node = new ASTNode(type, nodeProps);
      this.nodes.set(key, node);
    }
    return this.nodes.get(key);
  }

  parseNode() {
    const token = this.peek();

    switch (token.type) {
      case TokenType.TERMINAL:
        this.advance();
        return this.getOrCreateNode(NodeType.TERMINAL, token.value);

      case TokenType.PROCESS:
        this.advance();
        return this.getOrCreateNode(NodeType.PROCESS, token.value);

      case TokenType.DECISION:
        this.advance();
        return this.getOrCreateNode(NodeType.DECISION, token.value);

      case TokenType.IO:
        this.advance();
        return this.getOrCreateNode(NodeType.IO, token.value);

      default:
        return null;
    }
  }

  // Parse une chaîne de connexions et retourne { first, last }
  parseConnectionChain() {
    const sourceNode = this.parseNode();
    if (!sourceNode) return null;

    let firstNode = sourceNode;
    let lastNode = sourceNode;

    // Vérifier s'il y a une flèche
    while (this.match(TokenType.ARROW)) {
      // Label optionnel
      let label = null;
      const stringToken = this.match(TokenType.STRING);
      if (stringToken) {
        label = stringToken.value;
        this.match(TokenType.ARROW); // Consomme la flèche après le label
      }

      // Nœud cible
      const targetNode = this.parseNode();
      if (!targetNode) {
        throw new Error(`Nœud attendu après la flèche (ligne ${this.peek().line})`);
      }

      this.connections.push(new ASTNode(NodeType.CONNECTION, {
        from: lastNode.id,
        to: targetNode.id,
        label: label
      }));

      lastNode = targetNode;
    }

    return { first: firstNode, last: lastNode };
  }

  parseConnection() {
    const result = this.parseConnectionChain();
    return result ? result.last : null;
  }

  // Parse le contenu d'une cellule et extrait les modificateurs :rN, :cN, :al, :ac, :ar
  parseCellContent(text) {
    const cell = { text: text.trim(), colspan: 1, rowspan: 1, align: null };

    // Cherche les modificateurs :rN (rowspan), :cN (colspan), :al/:ac/:ar (alignement)
    const modifierRegex = /:([rca])(\d+|[lcr])?/g;
    let match;
    const modifiers = [];

    while ((match = modifierRegex.exec(text)) !== null) {
      const type = match[1];
      const value = match[2];

      // Alignement : :al, :ac, :ar (le "a" suivi de l, c, ou r)
      if (type === 'a' && value && ['l', 'c', 'r'].includes(value)) {
        modifiers.push({ type: 'align', value: value, full: match[0] });
      }
      // Rowspan : :rN
      else if (type === 'r' && value && /^\d+$/.test(value)) {
        modifiers.push({ type: 'r', value: parseInt(value, 10), full: match[0] });
      }
      // Colspan : :cN
      else if (type === 'c' && value && /^\d+$/.test(value)) {
        modifiers.push({ type: 'c', value: parseInt(value, 10), full: match[0] });
      }
    }

    // Applique les modificateurs et nettoie le texte
    modifiers.forEach(mod => {
      if (mod.type === 'r') {
        cell.rowspan = mod.value;
      } else if (mod.type === 'c') {
        cell.colspan = mod.value;
      } else if (mod.type === 'align') {
        // l = left, c = center, r = right
        cell.align = mod.value === 'l' ? 'left' : mod.value === 'c' ? 'center' : 'right';
      }
      cell.text = cell.text.replace(mod.full, '').trim();
    });

    return cell;
  }

  // Parse une ligne de tableau : | cell | cell | cell |
  parseTableRow() {
    const cells = [];

    // Doit commencer par un PIPE
    if (this.peek().type !== TokenType.PIPE) {
      return null;
    }

    this.advance(); // Consomme le premier |

    // Parse les cellules jusqu'à la fin de la ligne
    while (!this.isAtEnd()) {
      const token = this.peek();

      // Si on trouve un PIPE
      if (token.type === TokenType.PIPE) {
        // Vérifie si c'est le dernier PIPE de la ligne
        // (suivi d'un autre PIPE = nouvelle ligne, ou INDENT/DEDENT/EOF = fin)
        const next = this.peek(1);
        if (next.type === TokenType.PIPE ||
            next.type === TokenType.INDENT ||
            next.type === TokenType.DEDENT ||
            next.type === TokenType.EOF ||
            next.type === TokenType.TABLE ||
            next.type === TokenType.FLOW) {
          this.advance(); // Consomme le dernier PIPE de la ligne
          break;
        }
        this.advance(); // Consomme le PIPE entre cellules
        continue;
      }

      // Collecte le contenu de la cellule
      if (token.type === TokenType.IDENTIFIER || token.type === TokenType.STRING) {
        const cellContent = token.value.trim();
        // Cellule vide = null (pour les cellules couvertes par rowspan)
        if (cellContent === '' || cellContent === '-') {
          cells.push(null);
        } else {
          cells.push(this.parseCellContent(cellContent));
        }
        this.advance();
      } else {
        // Token non reconnu dans une cellule, on sort
        break;
      }
    }

    return cells.length > 0 ? cells : null;
  }

  // Parse un tableau complet
  parseTable() {
    // Récupère le titre
    const nameToken = this.match(TokenType.STRING);
    const tableName = nameToken ? nameToken.value : 'Table';

    const headerRows = [];  // Array de lignes d'en-têtes
    const rows = [];
    let parsingHeaders = true;

    // Consomme l'indentation si présente
    this.match(TokenType.INDENT);

    // Parse les lignes du tableau
    while (!this.isAtEnd()) {
      const row = this.parseTableRow();

      if (!row) {
        // Plus de lignes de tableau, on sort
        break;
      }

      // Vérifie si c'est une ligne d'en-tête (commence par "header")
      const firstCell = row[0];
      const isHeaderRow = firstCell && firstCell.text && firstCell.text.toLowerCase() === 'header';

      if (isHeaderRow) {
        // Ligne d'en-tête : on retire le marqueur "header" et on ajoute la ligne
        headerRows.push(row.slice(1));
      } else if (parsingHeaders && headerRows.length === 0) {
        // Première ligne sans "header" = en-tête simple (rétrocompatibilité)
        headerRows.push(row);
        parsingHeaders = false;
      } else {
        // Ligne de données
        parsingHeaders = false;
        rows.push(row);
      }

      // Consomme INDENT/DEDENT entre les lignes
      while (this.match(TokenType.INDENT) || this.match(TokenType.DEDENT)) {}
    }

    // Consomme les DEDENT restants
    while (this.match(TokenType.DEDENT)) {}

    // Rétrocompatibilité : convertir headerRows en format simple si pas de colspan/rowspan/align
    const hasComplexHeaders = headerRows.some(row =>
      row.some(cell => cell && (cell.colspan > 1 || cell.rowspan > 1 || cell.align))
    );

    // Format headers pour rétrocompatibilité
    let headers;
    if (hasComplexHeaders || headerRows.length > 1) {
      // Nouveau format : array de lignes d'en-têtes avec objets cellule
      headers = headerRows;
    } else if (headerRows.length === 1) {
      // Ancien format : array simple de strings
      headers = headerRows[0].map(cell => cell ? cell.text : '');
    } else {
      headers = [];
    }

    // Convertir rows en format simple si pas de modificateurs
    const hasComplexRows = rows.some(row =>
      row.some(cell => cell && (cell.colspan > 1 || cell.rowspan > 1 || cell.align))
    );

    const formattedRows = hasComplexRows || hasComplexHeaders
      ? rows
      : rows.map(row => row.map(cell => cell ? cell.text : ''));

    return new ASTNode(NodeType.TABLE, {
      name: tableName,
      headers: headers,
      rows: formattedRows,
      isComplex: hasComplexHeaders || hasComplexRows
    });
  }

  // Parse la liste des acteurs : | Actor1 | Actor2 | Actor3 |
  parseActorsList() {
    const actors = [];

    // Consomme l'indentation si présente
    this.match(TokenType.INDENT);

    // Doit commencer par un PIPE
    if (this.peek().type !== TokenType.PIPE) {
      return actors;
    }

    this.advance(); // Consomme le premier |

    // Parse les acteurs jusqu'à la fin
    while (!this.isAtEnd()) {
      const token = this.peek();

      if (token.type === TokenType.PIPE) {
        const next = this.peek(1);
        // Dernier PIPE de la ligne (suivi de DEDENT, EOF, ou autre type de bloc)
        if (next.type === TokenType.DEDENT ||
            next.type === TokenType.EOF ||
            next.type === TokenType.INDENT ||
            next.type === TokenType.FLOW ||
            next.type === TokenType.TABLE ||
            next.type === TokenType.SWIMLANE) {
          this.advance(); // Consomme le dernier PIPE
          break;
        }
        // PIPE entre les acteurs - continuer
        this.advance();
        continue;
      }

      if (token.type === TokenType.IDENTIFIER) {
        actors.push(token.value.trim());
        this.advance();
      } else {
        break;
      }
    }

    // Consomme les DEDENT
    while (this.match(TokenType.DEDENT)) {}

    return actors;
  }

  // Parse un nœud avec référence d'acteur optionnelle : Acteur: {Action} ou {Action}
  parseSwimlaneNode() {
    const token = this.peek();
    let actor = null;

    // Vérifie si c'est une référence d'acteur (IDENTIFIER suivi de COLON)
    if (token.type === TokenType.IDENTIFIER && this.peek(1).type === TokenType.COLON) {
      actor = token.value.trim();
      this.advance(); // Consomme l'identifiant
      this.advance(); // Consomme le :
      this.currentActor = actor;
    }

    // Parse le nœud lui-même
    const nodeToken = this.peek();
    let nodeType = null;

    switch (nodeToken.type) {
      case TokenType.TERMINAL:
        nodeType = NodeType.TERMINAL;
        break;
      case TokenType.PROCESS:
        nodeType = NodeType.PROCESS;
        break;
      case TokenType.DECISION:
        nodeType = NodeType.DECISION;
        break;
      case TokenType.IO:
        nodeType = NodeType.IO;
        break;
      default:
        return null;
    }

    this.advance();
    return this.getOrCreateNode(nodeType, nodeToken.value, actor || this.currentActor);
  }

  // Parse une chaîne de connexions swimlane
  parseSwimlaneConnectionChain() {
    const sourceNode = this.parseSwimlaneNode();
    if (!sourceNode) return null;

    let firstNode = sourceNode;
    let lastNode = sourceNode;

    // Vérifier s'il y a une flèche
    while (this.match(TokenType.ARROW)) {
      // Label optionnel
      let label = null;
      const stringToken = this.match(TokenType.STRING);
      if (stringToken) {
        label = stringToken.value;
        this.match(TokenType.ARROW);
      }

      // Nœud cible (avec potentiel changement d'acteur)
      const targetNode = this.parseSwimlaneNode();
      if (!targetNode) {
        throw new Error(`Nœud attendu après la flèche (ligne ${this.peek().line})`);
      }

      this.connections.push(new ASTNode(NodeType.CONNECTION, {
        from: lastNode.id,
        to: targetNode.id,
        label: label
      }));

      lastNode = targetNode;
    }

    return { first: firstNode, last: lastNode };
  }

  // Parse les branches swimlane
  parseSwimlaneBranches(decisionNode) {
    while (this.match(TokenType.INDENT)) {
      while (this.peek().type === TokenType.PIPE) {
        this.advance(); // Consomme le |

        const labelToken = this.match(TokenType.IDENTIFIER, TokenType.STRING);
        const label = labelToken ? labelToken.value : '';

        if (!this.match(TokenType.ARROW)) {
          continue;
        }

        const chain = this.parseSwimlaneConnectionChain();
        if (chain) {
          this.connections.push(new ASTNode(NodeType.CONNECTION, {
            from: decisionNode.id,
            to: chain.first.id,
            label: label
          }));
        }
      }

      while (this.match(TokenType.DEDENT)) {}
    }
  }

  // Parse un swimlane complet
  parseSwimlane() {
    // Récupère le titre
    const nameToken = this.match(TokenType.STRING);
    const swimlaneName = nameToken ? nameToken.value : 'Swimlane';

    // Active le mode swimlane
    this.swimlaneMode = true;

    // Parse les acteurs (après le mot-clé "actors")
    while (!this.isAtEnd()) {
      if (this.match(TokenType.ACTORS)) {
        this.actors = this.parseActorsList();
        break;
      }

      // Skip autres tokens jusqu'à actors
      if (this.peek().type === TokenType.IDENTIFIER ||
          this.peek().type === TokenType.TERMINAL ||
          this.peek().type === TokenType.PROCESS ||
          this.peek().type === TokenType.DECISION) {
        break; // Pas de déclaration actors, on passe aux nœuds
      }

      this.advance();
    }

    // Parse les statements swimlane
    while (!this.isAtEnd()) {
      const token = this.peek();

      // Fin du swimlane si on rencontre un autre type de diagramme
      if (token.type === TokenType.FLOW ||
          token.type === TokenType.TABLE ||
          token.type === TokenType.SWIMLANE) {
        break;
      }

      // Parse les nœuds et connexions swimlane
      // Un statement swimlane doit être: IDENTIFIER COLON NOEUD (ex: "Thibaud: {Action}")
      if (token.type === TokenType.IDENTIFIER && this.peek(1).type === TokenType.COLON) {
        const result = this.parseSwimlaneConnectionChain();

        // Si c'est une décision, chercher les branches
        if (result && result.last && result.last.type === NodeType.DECISION) {
          this.parseSwimlaneBranches(result.last);
        }

        continue;
      }

      // Nœud sans référence d'acteur (Terminal, Process, etc.)
      if (token.type === TokenType.TERMINAL ||
          token.type === TokenType.PROCESS ||
          token.type === TokenType.DECISION ||
          token.type === TokenType.IO) {

        const result = this.parseSwimlaneConnectionChain();

        if (result && result.last && result.last.type === NodeType.DECISION) {
          this.parseSwimlaneBranches(result.last);
        }

        continue;
      }

      // Skip tokens non reconnus (PIPE, INDENT, DEDENT, IDENTIFIER seul, etc.)
      this.advance();
    }

    return new ASTNode(NodeType.SWIMLANE, {
      name: swimlaneName,
      actors: this.actors,
      nodes: Array.from(this.nodes.values()),
      connections: this.connections
    });
  }

  parseBranches(decisionNode) {
    // Parser les branches conditionnelles
    // Format: | label -> ...
    while (this.match(TokenType.INDENT)) {
      while (this.peek().type === TokenType.PIPE) {
        this.advance(); // Consomme le |

        // Récupère le label de la branche
        const labelToken = this.match(TokenType.IDENTIFIER, TokenType.STRING);
        const label = labelToken ? labelToken.value : '';

        // Attend la flèche
        if (!this.match(TokenType.ARROW)) {
          continue;
        }

        // Parse la suite de la branche (chaîne de connexions)
        const chain = this.parseConnectionChain();
        if (chain) {
          // Connecte la décision au PREMIER nœud de la chaîne
          this.connections.push(new ASTNode(NodeType.CONNECTION, {
            from: decisionNode.id,
            to: chain.first.id,
            label: label
          }));
        }
      }

      // Consomme les DEDENT
      while (this.match(TokenType.DEDENT)) {}
    }
  }

  parseStatement() {
    // Flow declaration
    if (this.match(TokenType.FLOW)) {
      const nameToken = this.match(TokenType.STRING);
      return { type: 'flow_declaration', name: nameToken ? nameToken.value : 'Untitled' };
    }

    // Table declaration
    if (this.match(TokenType.TABLE)) {
      return { type: 'table_declaration', table: this.parseTable() };
    }

    // Swimlane declaration
    if (this.match(TokenType.SWIMLANE)) {
      return { type: 'swimlane_declaration', swimlane: this.parseSwimlane() };
    }

    // Connection chain ou nœud seul
    const result = this.parseConnection();

    // Si c'est une décision, chercher les branches
    if (result && result.type === NodeType.DECISION) {
      this.parseBranches(result);
    }

    return result;
  }

  parse() {
    let flowName = 'Flowchart';
    let tableResult = null;
    let swimlaneResult = null;

    while (!this.isAtEnd()) {
      const statement = this.parseStatement();

      if (statement && statement.type === 'flow_declaration') {
        flowName = statement.name;
      }

      // Si c'est un tableau, on le stocke pour le retourner
      if (statement && statement.type === 'table_declaration') {
        tableResult = statement.table;
      }

      // Si c'est un swimlane, on le stocke pour le retourner
      if (statement && statement.type === 'swimlane_declaration') {
        swimlaneResult = statement.swimlane;
      }

      // Skip tokens non reconnus
      if (!statement && !this.isAtEnd()) {
        this.advance();
      }
    }

    // Si on a parsé un swimlane, on le retourne
    if (swimlaneResult) {
      return swimlaneResult;
    }

    // Si on a parsé un tableau, on le retourne
    if (tableResult) {
      return tableResult;
    }

    // Sinon on retourne le flowchart
    return new ASTNode(NodeType.FLOWCHART, {
      name: flowName,
      nodes: Array.from(this.nodes.values()),
      connections: this.connections
    });
  }
}

function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}

module.exports = {
  Parser,
  ASTNode,
  NodeType,
  parse
};
