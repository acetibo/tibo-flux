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

  describe('Tableaux', () => {
    test('parse un tableau simple', () => {
      const code = `
table "Mon tableau"
  | header | Col1 | Col2 |
  | Ligne1 | A | B |
`;
      const ast = parseCode(code);

      expect(ast.type).toBe(NodeType.TABLE);
      expect(ast.name).toBe('Mon tableau');
    });

    test('parse les en-têtes du tableau', () => {
      const code = `
table "Test"
  | header | Scénario 1 | Scénario 2 |
  | Domaine | CREAI | Presta |
`;
      const ast = parseCode(code);

      expect(ast.headers).toContain('Scénario 1');
      expect(ast.headers).toContain('Scénario 2');
    });

    test('parse les lignes de données', () => {
      const code = `
table "Test"
  | header | A | B |
  | Ligne1 | X | Y |
  | Ligne2 | Z | W |
`;
      const ast = parseCode(code);

      expect(ast.rows).toHaveLength(2);
      expect(ast.rows[0]).toContain('Ligne1');
      expect(ast.rows[1]).toContain('Ligne2');
    });

    test('parse colspan avec :cN', () => {
      const code = `
table "Test colspan"
  | header | Catégorie:c2 | Info |
  | header | Sous1 | Sous2 | Détail |
`;
      const ast = parseCode(code);

      expect(ast.isComplex).toBe(true);
      // La première ligne d'en-tête contient une cellule avec colspan=2
      const headerRow = ast.headers[0];
      const colspanCell = headerRow.find(cell => cell && cell.colspan === 2);
      expect(colspanCell).toBeDefined();
      expect(colspanCell.text).toBe('Catégorie');
    });

    test('parse rowspan avec :rN', () => {
      const code = `
table "Test rowspan"
  | header | Col1 | Col2 |
  | Label:r2 | A | B |
  | - | C | D |
`;
      const ast = parseCode(code);

      expect(ast.isComplex).toBe(true);
      // La première cellule de la première ligne a rowspan=2
      const firstRow = ast.rows[0];
      const rowspanCell = firstRow.find(cell => cell && cell.rowspan === 2);
      expect(rowspanCell).toBeDefined();
      expect(rowspanCell.text).toBe('Label');
    });

    test('parse cellules couvertes (-) comme null', () => {
      const code = `
table "Test cellules couvertes"
  | header | A | B |
  | Label:r2 | X | Y |
  | - | Z | W |
`;
      const ast = parseCode(code);

      // La cellule "-" devient null (couverte par rowspan)
      const secondRow = ast.rows[1];
      expect(secondRow[0]).toBeNull();
    });

    test('parse en-têtes multiples', () => {
      const code = `
table "Test multi-headers"
  | header | Groupe A:c2 | Groupe B |
  | header | A1 | A2 | B1 |
  | Ligne | 1 | 2 | 3 |
`;
      const ast = parseCode(code);

      // headers est un array de lignes d'en-têtes
      expect(ast.headers).toHaveLength(2);
      expect(ast.headers[0]).toHaveLength(2); // Groupe A:c2, Groupe B
      expect(ast.headers[1]).toHaveLength(3); // A1, A2, B1
    });

    test('parse caractères Unicode (É, accents)', () => {
      const code = `
table "Évolution des données"
  | header | Catégorie | Résultat |
  | Données été | Très bien | Réussi |
`;
      const ast = parseCode(code);

      expect(ast.name).toBe('Évolution des données');
      expect(ast.headers).toContain('Catégorie');
      expect(ast.headers).toContain('Résultat');
      expect(ast.rows[0]).toContain('Données été');
    });
  });
});
