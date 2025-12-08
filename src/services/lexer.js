/**
 * Lexer TiboFlux
 * Transforme le code source en tokens
 */

const TokenType = {
  // Mots-clés
  FLOW: 'FLOW',
  TABLE: 'TABLE',
  SWIMLANE: 'SWIMLANE',
  ACTORS: 'ACTORS',

  // Nœuds
  TERMINAL: 'TERMINAL',       // [texte]
  PROCESS: 'PROCESS',         // {texte}
  DECISION: 'DECISION',       // <texte?>
  IO: 'IO',                   // (texte)

  // Connexions
  ARROW: 'ARROW',             // -> ou -->
  PIPE: 'PIPE',               // |
  COLON: 'COLON',             // : (pour Acteur: dans swimlanes)

  // Littéraux
  STRING: 'STRING',           // "texte"
  IDENTIFIER: 'IDENTIFIER',   // mot simple

  // Structure
  NEWLINE: 'NEWLINE',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  COMMENT: 'COMMENT',         // # commentaire

  // Fin
  EOF: 'EOF'
};

class Token {
  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
  }
}

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.indentStack = [0];
    this.inTableMode = false; // Mode tableau : après "table" jusqu'à la prochaine ligne vide ou nouveau bloc
    this.inSwimlaneMode = false; // Mode swimlane : après "swimlane"
  }

  peek(offset = 0) {
    return this.source[this.pos + offset] || '\0';
  }

  advance() {
    const char = this.source[this.pos++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  isAtEnd() {
    return this.pos >= this.source.length;
  }

  skipWhitespace() {
    while (!this.isAtEnd() && this.peek() === ' ' && this.peek() !== '\n') {
      this.advance();
    }
  }

  addToken(type, value) {
    this.tokens.push(new Token(type, value, this.line, this.column));
  }

  scanString(quote) {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // Consomme le guillemet ouvrant

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peek(1) === quote) {
        this.advance();
      }
      value += this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(`Chaîne non terminée à la ligne ${startLine}, colonne ${startColumn}`);
    }

    this.advance(); // Consomme le guillemet fermant
    this.tokens.push(new Token(TokenType.STRING, value, startLine, startColumn));
  }

  scanBracketedNode(openChar, closeChar, tokenType) {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // Consomme le caractère ouvrant

    let value = '';
    let depth = 1;

    while (!this.isAtEnd() && depth > 0) {
      const char = this.peek();
      if (char === openChar) depth++;
      else if (char === closeChar) depth--;

      if (depth > 0) {
        value += this.advance();
      }
    }

    if (depth !== 0) {
      throw new Error(`${openChar} non fermé à la ligne ${startLine}, colonne ${startColumn}`);
    }

    this.advance(); // Consomme le caractère fermant
    this.tokens.push(new Token(tokenType, value.trim(), startLine, startColumn));
  }

  // Scanne le contenu d'une cellule de tableau (tout jusqu'au prochain | ou fin de ligne)
  scanTableCell() {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '|' && this.peek() !== '\n') {
      value += this.advance();
    }

    value = value.trim();

    if (value) {
      this.tokens.push(new Token(TokenType.IDENTIFIER, value, this.line, startColumn));
    }
  }

  scanIdentifier() {
    const startColumn = this.column;
    let value = '';

    // Caractères qui terminent un identifiant (délimiteurs)
    const delimiters = new Set(['|', '[', ']', '{', '}', '<', '>', '(', ')', '#', '"', "'", '\n', '\0', ':']);

    while (!this.isAtEnd() && this.peek() !== '\n') {
      const char = this.peek();
      const next = this.peek(1);

      // Délimiteur = fin de l'identifiant
      if (delimiters.has(char)) {
        break;
      }

      // Tiret : accepté sauf si c'est une flèche
      if (char === '-' && (next === '>' || next === '-')) {
        break;
      }

      // Tout autre caractère fait partie de l'identifiant
      value += this.advance();
    }

    value = value.trim();

    // Mots-clés
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'flow') {
      this.inTableMode = false;
      this.inSwimlaneMode = false;
      this.tokens.push(new Token(TokenType.FLOW, value, this.line, startColumn));
    } else if (lowerValue === 'table') {
      this.inTableMode = true;
      this.inSwimlaneMode = false;
      this.tokens.push(new Token(TokenType.TABLE, value, this.line, startColumn));
    } else if (lowerValue === 'swimlane') {
      this.inTableMode = false;
      this.inSwimlaneMode = true;
      this.tokens.push(new Token(TokenType.SWIMLANE, value, this.line, startColumn));
    } else if (lowerValue === 'actors') {
      this.tokens.push(new Token(TokenType.ACTORS, value, this.line, startColumn));
    } else if (value) {
      this.tokens.push(new Token(TokenType.IDENTIFIER, value, this.line, startColumn));
    }
  }

  handleIndentation() {
    let indent = 0;
    while (this.peek() === ' ') {
      indent++;
      this.advance();
    }

    // Ignorer les lignes vides ou commentaires
    if (this.peek() === '\n' || this.peek() === '#') {
      return;
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.addToken(TokenType.INDENT, indent);
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop();
        this.addToken(TokenType.DEDENT, indent);
      }
    }
  }

  tokenize() {
    while (!this.isAtEnd()) {
      const char = this.peek();

      // Nouvelle ligne
      if (char === '\n') {
        this.addToken(TokenType.NEWLINE, '\\n');
        this.advance();
        this.handleIndentation();
        continue;
      }

      // Espaces (hors début de ligne)
      if (char === ' ' || char === '\t') {
        this.advance();
        continue;
      }

      // Commentaires
      if (char === '#') {
        const startColumn = this.column;
        let comment = '';
        while (!this.isAtEnd() && this.peek() !== '\n') {
          comment += this.advance();
        }
        this.tokens.push(new Token(TokenType.COMMENT, comment.slice(1).trim(), this.line, startColumn));
        continue;
      }

      // Chaînes
      if (char === '"' || char === "'") {
        this.scanString(char);
        continue;
      }

      // Nœuds terminaux [...]
      if (char === '[') {
        this.scanBracketedNode('[', ']', TokenType.TERMINAL);
        continue;
      }

      // Nœuds processus {...}
      if (char === '{') {
        this.scanBracketedNode('{', '}', TokenType.PROCESS);
        continue;
      }

      // Nœuds décision <...>
      if (char === '<') {
        this.scanBracketedNode('<', '>', TokenType.DECISION);
        continue;
      }

      // Nœuds I/O (...)
      if (char === '(') {
        this.scanBracketedNode('(', ')', TokenType.IO);
        continue;
      }

      // Flèches (vérifie AVANT de consommer si c'est vraiment une flèche)
      if (char === '-') {
        const next = this.peek(1);
        const nextNext = this.peek(2);

        // Vérifie si c'est une flèche -> ou -->
        if (next === '>' || (next === '-' && nextNext === '>')) {
          const startColumn = this.column;
          this.advance(); // Consomme le premier -
          if (this.peek() === '-') {
            this.advance(); // Consomme le second -
            if (this.peek() === '>') {
              this.advance(); // Consomme le >
              this.tokens.push(new Token(TokenType.ARROW, '-->', this.line, startColumn));
            }
          } else if (this.peek() === '>') {
            this.advance(); // Consomme le >
            this.tokens.push(new Token(TokenType.ARROW, '->', this.line, startColumn));
          }
          continue;
        }
        // Si ce n'est pas une flèche, on laisse tomber pour qu'il soit traité comme partie d'un identifiant
      }

      // Pipe pour les branches ou cellules de tableau
      if (char === '|') {
        this.addToken(TokenType.PIPE, '|');
        this.advance();

        // En mode tableau, scanner la cellule suivante
        if (this.inTableMode) {
          this.skipWhitespace();
          if (this.peek() !== '|' && this.peek() !== '\n' && !this.isAtEnd()) {
            this.scanTableCell();
          }
        }
        continue;
      }

      // Deux-points pour les références d'acteur (swimlanes)
      if (char === ':') {
        this.addToken(TokenType.COLON, ':');
        this.advance();
        continue;
      }

      // Identifiants et mots-clés (tout caractère non-délimiteur)
      // Utilise une approche négative : tout sauf les délimiteurs connus
      if (!/^[\s\|\[\]\{\}<>\(\)#"'\-]$/.test(char) || (char === '-' && this.peek(1) !== '>' && this.peek(1) !== '-')) {
        this.scanIdentifier();
        continue;
      }

      // Caractère inconnu - on skip
      this.advance();
    }

    // Fermer tous les indents restants
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken(TokenType.DEDENT, 0);
    }

    this.addToken(TokenType.EOF, null);
    return this.tokens;
  }
}

function tokenize(source) {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

module.exports = {
  Lexer,
  Token,
  TokenType,
  tokenize
};
