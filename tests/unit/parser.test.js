const { tokenize } = require('../../src/services/lexer');
const { parse, NodeType } = require('../../src/services/parser');

describe('Parser TiboFlux', () => {
  function parseCode(code) {
    const tokens = tokenize(code);
    return parse(tokens);
  }

  describe('Structure de base', () => {
    test('parse un flowchart vide', () => {
      const ast = parseCode('');
      expect(ast.type).toBe('Flowchart');
      expect(ast.nodes).toHaveLength(0);
      expect(ast.connections).toHaveLength(0);
    });

    test('parse le nom du flow', () => {
      const ast = parseCode('flow "Mon processus"');
      expect(ast.name).toBe('Mon processus');
    });
  });

  describe('Nœuds', () => {
    test('parse un nœud terminal', () => {
      const ast = parseCode('[Début]');
      expect(ast.nodes).toHaveLength(1);
      expect(ast.nodes[0].type).toBe(NodeType.TERMINAL);
      expect(ast.nodes[0].text).toBe('Début');
    });

    test('parse un nœud processus', () => {
      const ast = parseCode('{Action}');
      expect(ast.nodes[0].type).toBe(NodeType.PROCESS);
    });

    test('parse un nœud décision', () => {
      const ast = parseCode('<Question?>');
      expect(ast.nodes[0].type).toBe(NodeType.DECISION);
    });

    test('parse un nœud I/O', () => {
      const ast = parseCode('(Entrée)');
      expect(ast.nodes[0].type).toBe(NodeType.IO);
    });
  });

  describe('Connexions', () => {
    test('parse une connexion simple', () => {
      const ast = parseCode('[A] -> [B]');
      expect(ast.nodes).toHaveLength(2);
      expect(ast.connections).toHaveLength(1);
      expect(ast.connections[0].from).toBe(ast.nodes[0].id);
      expect(ast.connections[0].to).toBe(ast.nodes[1].id);
    });

    test('parse une chaîne de connexions', () => {
      const ast = parseCode('[A] -> {B} -> [C]');
      expect(ast.nodes).toHaveLength(3);
      expect(ast.connections).toHaveLength(2);
    });

    test('réutilise les nœuds existants', () => {
      const ast = parseCode(`
        [A] -> [B]
        [A] -> [C]
      `);
      // [A] ne devrait exister qu'une fois
      const nodeA = ast.nodes.filter(n => n.text === 'A');
      expect(nodeA).toHaveLength(1);
    });
  });

  describe('Cas complexes', () => {
    test('parse un flowchart complet', () => {
      const code = `
flow "Processus de commande"

[Début] -> {Vérifier stock}
{Vérifier stock} -> <Disponible?>
<Disponible?>
  | oui -> {Paiement} -> [Fin]
  | non -> {Notification} -> [Fin]
`;
      const ast = parseCode(code);

      expect(ast.name).toBe('Processus de commande');
      expect(ast.nodes.length).toBeGreaterThanOrEqual(5);
      expect(ast.connections.length).toBeGreaterThanOrEqual(4);
    });
  });
});
