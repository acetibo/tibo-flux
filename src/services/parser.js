/**
 * Parser TiboFlux
 * Transforme les tokens en AST (Abstract Syntax Tree)
 */

const { TokenType } = require('./lexer');

// Types de nœuds dans l'AST
const NodeType = {
  FLOWCHART: 'Flowchart',
  TABLE: 'Table',
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
  getOrCreateNode(type, text) {
    const key = `${type}:${text}`;
    if (!this.nodes.has(key)) {
      const node = new ASTNode(type, {
        id: `node_${this.nodes.size}`,
        text: text
      });
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

  // Parse le contenu d'une cellule et extrait les modificateurs :rN, :cN
  parseCellContent(text) {
    const cell = { text: text.trim(), colspan: 1, rowspan: 1 };

    // Cherche les modificateurs :rN (rowspan) et :cN (colspan)
    const modifierRegex = /:([rc])(\d+)/g;
    let match;
    const modifiers = [];

    while ((match = modifierRegex.exec(text)) !== null) {
      modifiers.push({ type: match[1], value: parseInt(match[2], 10), full: match[0] });
    }

    // Applique les modificateurs et nettoie le texte
    modifiers.forEach(mod => {
      if (mod.type === 'r') {
        cell.rowspan = mod.value;
      } else if (mod.type === 'c') {
        cell.colspan = mod.value;
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

    // Rétrocompatibilité : convertir headerRows en format simple si pas de colspan/rowspan
    const hasComplexHeaders = headerRows.some(row =>
      row.some(cell => cell && (cell.colspan > 1 || cell.rowspan > 1))
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
      row.some(cell => cell && (cell.colspan > 1 || cell.rowspan > 1))
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

    while (!this.isAtEnd()) {
      const statement = this.parseStatement();

      if (statement && statement.type === 'flow_declaration') {
        flowName = statement.name;
      }

      // Si c'est un tableau, on le stocke pour le retourner
      if (statement && statement.type === 'table_declaration') {
        tableResult = statement.table;
      }

      // Skip tokens non reconnus
      if (!statement && !this.isAtEnd()) {
        this.advance();
      }
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
