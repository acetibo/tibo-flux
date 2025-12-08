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

    test('parse alignement avec :al, :ac, :ar', () => {
      const code = `
table "Budget"
  | header | Poste | Montant:ar |
  | Hébergement:al | 500 €:ar |
  | Maintenance:ac | 1200 €:ar |
`;
      const ast = parseCode(code);

      // Headers avec alignement (format complexe : array de lignes)
      expect(ast.headers[0][0].text).toBe('Poste');
      expect(ast.headers[0][0].align).toBeNull(); // pas d'alignement explicite
      expect(ast.headers[0][1].text).toBe('Montant');
      expect(ast.headers[0][1].align).toBe('right');

      // Données avec alignement
      expect(ast.rows[0][0].text).toBe('Hébergement');
      expect(ast.rows[0][0].align).toBe('left');
      expect(ast.rows[0][1].text).toBe('500 €');
      expect(ast.rows[0][1].align).toBe('right');
      expect(ast.rows[1][0].text).toBe('Maintenance');
      expect(ast.rows[1][0].align).toBe('center');
    });
  });

  describe('Swimlanes', () => {
    test('parse un swimlane simple', () => {
      const code = `
swimlane "Réunion ARS"

actors
  | Thibaud | Cheffe projet | ARS |
`;
      const ast = parseCode(code);

      expect(ast.type).toBe('Swimlane');
      expect(ast.name).toBe('Réunion ARS');
      expect(ast.actors).toEqual(['Thibaud', 'Cheffe projet', 'ARS']);
    });

    test('parse les acteurs du swimlane', () => {
      const code = `
swimlane "Test"
actors
  | Alice | Bob | Charlie |
`;
      const ast = parseCode(code);

      expect(ast.actors).toHaveLength(3);
      expect(ast.actors).toContain('Alice');
      expect(ast.actors).toContain('Bob');
      expect(ast.actors).toContain('Charlie');
    });

    test('parse une action avec référence acteur', () => {
      const code = `
swimlane "Test"
actors
  | Thibaud |

Thibaud: {Prépare documentation}
`;
      const ast = parseCode(code);

      expect(ast.nodes).toHaveLength(1);
      expect(ast.nodes[0].type).toBe(NodeType.PROCESS);
      expect(ast.nodes[0].text).toBe('Prépare documentation');
      expect(ast.nodes[0].actor).toBe('Thibaud');
    });

    test('parse une connexion entre acteurs', () => {
      const code = `
swimlane "Test"
actors
  | Thibaud | Cheffe |

Thibaud: {Prépare doc} -> Cheffe: {Valide}
`;
      const ast = parseCode(code);

      expect(ast.nodes).toHaveLength(2);
      expect(ast.connections).toHaveLength(1);

      const node1 = ast.nodes.find(n => n.text === 'Prépare doc');
      const node2 = ast.nodes.find(n => n.text === 'Valide');

      expect(node1.actor).toBe('Thibaud');
      expect(node2.actor).toBe('Cheffe');
      expect(ast.connections[0].from).toBe(node1.id);
      expect(ast.connections[0].to).toBe(node2.id);
    });

    test('parse un swimlane complet avec branches', () => {
      const code = `
swimlane "Réunion ARS - Janvier 2025"

actors
  | Thibaud | Cheffe projet | ARS |

Thibaud: {Prépare documentation}
Thibaud: {Prépare documentation} -> Cheffe projet: {Valide contenu}
Cheffe projet: {Valide contenu} -> ARS: <Choix scénario?>
ARS: <Choix scénario?>
  | A -> [Passation complète]
  | B -> [Passation partielle]
`;
      const ast = parseCode(code);

      expect(ast.type).toBe('Swimlane');
      expect(ast.name).toBe('Réunion ARS - Janvier 2025');
      expect(ast.actors).toEqual(['Thibaud', 'Cheffe projet', 'ARS']);
      expect(ast.nodes.length).toBeGreaterThanOrEqual(4);
      expect(ast.connections.length).toBeGreaterThanOrEqual(3);

      // Vérifie que les acteurs sont bien associés aux nœuds
      const prepareDoc = ast.nodes.find(n => n.text === 'Prépare documentation');
      expect(prepareDoc.actor).toBe('Thibaud');

      const valide = ast.nodes.find(n => n.text === 'Valide contenu');
      expect(valide.actor).toBe('Cheffe projet');

      const choix = ast.nodes.find(n => n.text === 'Choix scénario?');
      expect(choix.actor).toBe('ARS');
    });

    test('parse des nœuds terminaux dans swimlane', () => {
      const code = `
swimlane "Test"
actors
  | Alice |

Alice: [Début] -> Alice: {Action} -> Alice: [Fin]
`;
      const ast = parseCode(code);

      const debut = ast.nodes.find(n => n.text === 'Début');
      const fin = ast.nodes.find(n => n.text === 'Fin');

      expect(debut.type).toBe(NodeType.TERMINAL);
      expect(debut.actor).toBe('Alice');
      expect(fin.type).toBe(NodeType.TERMINAL);
      expect(fin.actor).toBe('Alice');
    });
  });
});
