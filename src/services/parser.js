/**
 * Parser TiboFlux
 * Transforme les tokens en AST (Abstract Syntax Tree)
 */

const { TokenType } = require('./lexer');

// Types de nœuds dans l'AST
const NodeType = {
  FLOWCHART: 'Flowchart',
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

    while (!this.isAtEnd()) {
      const statement = this.parseStatement();

      if (statement && statement.type === 'flow_declaration') {
        flowName = statement.name;
      }

      // Skip tokens non reconnus
      if (!statement && !this.isAtEnd()) {
        this.advance();
      }
    }

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
