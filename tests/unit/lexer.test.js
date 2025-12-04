const { tokenize, TokenType } = require('../../src/services/lexer');

describe('Lexer TiboFlux', () => {
  describe('Tokens de base', () => {
    test('tokenize une chaîne vide', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    test('tokenize le mot-clé flow', () => {
      const tokens = tokenize('flow "Test"');
      expect(tokens[0].type).toBe(TokenType.FLOW);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('Test');
    });

    test('tokenize les commentaires', () => {
      const tokens = tokenize('# Ceci est un commentaire');
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe('Ceci est un commentaire');
    });
  });

  describe('Nœuds', () => {
    test('tokenize un nœud terminal [...]', () => {
      const tokens = tokenize('[Début]');
      expect(tokens[0].type).toBe(TokenType.TERMINAL);
      expect(tokens[0].value).toBe('Début');
    });

    test('tokenize un nœud processus {...}', () => {
      const tokens = tokenize('{Action}');
      expect(tokens[0].type).toBe(TokenType.PROCESS);
      expect(tokens[0].value).toBe('Action');
    });

    test('tokenize un nœud décision <...>', () => {
      const tokens = tokenize('<Test?>');
      expect(tokens[0].type).toBe(TokenType.DECISION);
      expect(tokens[0].value).toBe('Test?');
    });

    test('tokenize un nœud I/O (...)', () => {
      const tokens = tokenize('(Entrée)');
      expect(tokens[0].type).toBe(TokenType.IO);
      expect(tokens[0].value).toBe('Entrée');
    });
  });

  describe('Connexions', () => {
    test('tokenize une flèche simple ->', () => {
      const tokens = tokenize('[A] -> [B]');
      expect(tokens[0].type).toBe(TokenType.TERMINAL);
      expect(tokens[1].type).toBe(TokenType.ARROW);
      expect(tokens[1].value).toBe('->');
      expect(tokens[2].type).toBe(TokenType.TERMINAL);
    });

    test('tokenize une flèche longue -->', () => {
      const tokens = tokenize('[A] --> [B]');
      expect(tokens[1].type).toBe(TokenType.ARROW);
      expect(tokens[1].value).toBe('-->');
    });

    test('tokenize un pipe |', () => {
      const tokens = tokenize('| oui');
      expect(tokens[0].type).toBe(TokenType.PIPE);
    });
  });

  describe('Cas complexes', () => {
    test('tokenize un flowchart complet', () => {
      const code = `
flow "Test"

[Début] -> {Action}
{Action} -> <Décision?>
<Décision?>
  | oui -> [Fin]
  | non -> {Autre}
`;
      const tokens = tokenize(code);

      const types = tokens.map(t => t.type);
      expect(types).toContain(TokenType.FLOW);
      expect(types).toContain(TokenType.STRING);
      expect(types).toContain(TokenType.TERMINAL);
      expect(types).toContain(TokenType.PROCESS);
      expect(types).toContain(TokenType.DECISION);
      expect(types).toContain(TokenType.ARROW);
      expect(types).toContain(TokenType.PIPE);
    });

    test('gère les caractères accentués', () => {
      const tokens = tokenize('{Vérifier données}');
      expect(tokens[0].value).toBe('Vérifier données');
    });
  });
});
