const { tokenize } = require('../../src/services/lexer');
const { parse } = require('../../src/services/parser');
const { render } = require('../../src/services/renderer');

describe('Renderer TiboFlux', () => {
  function renderCode(code) {
    const tokens = tokenize(code);
    const ast = parse(tokens);
    return render(ast);
  }

  describe('Structure SVG', () => {
    test('génère un SVG valide', () => {
      const svg = renderCode('[Début]');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    test('inclut les définitions de marqueurs', () => {
      const svg = renderCode('[A] -> [B]');
      expect(svg).toContain('<defs>');
      expect(svg).toContain('arrowhead');
    });
  });

  describe('Rendu des nœuds', () => {
    test('rend un nœud terminal avec bords arrondis', () => {
      const svg = renderCode('[Début]');
      expect(svg).toContain('Début');
      expect(svg).toContain('rx='); // Bords arrondis
    });

    test('rend un nœud processus rectangulaire', () => {
      const svg = renderCode('{Action}');
      expect(svg).toContain('Action');
      expect(svg).toContain('<rect');
    });

    test('rend un nœud décision en losange', () => {
      const svg = renderCode('<Question?>');
      expect(svg).toContain('Question?');
      expect(svg).toContain('<polygon');
    });

    test('rend un nœud I/O en parallélogramme', () => {
      const svg = renderCode('(Entrée)');
      expect(svg).toContain('Entrée');
      expect(svg).toContain('<polygon');
    });
  });

  describe('Rendu des connexions', () => {
    test('rend une flèche entre deux nœuds', () => {
      const svg = renderCode('[A] -> [B]');
      expect(svg).toContain('<path');
      expect(svg).toContain('marker-end="url(#arrowhead)"');
    });
  });

  describe('Titre', () => {
    test('affiche le titre du flowchart', () => {
      const svg = renderCode('flow "Mon Diagramme"');
      expect(svg).toContain('Mon Diagramme');
    });
  });

  describe('Échappement XML', () => {
    test('échappe les caractères spéciaux', () => {
      const svg = renderCode('[Test <>&"]');
      expect(svg).toContain('&lt;');
      expect(svg).toContain('&gt;');
      expect(svg).toContain('&amp;');
    });
  });

  describe('Tableaux', () => {
    test('génère un SVG valide pour un tableau', () => {
      const code = `
table "Test"
  | header | A | B |
  | X | 1 | 2 |
`;
      const svg = renderCode(code);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    test('affiche le titre du tableau', () => {
      const code = `
table "Mon Tableau"
  | header | Col |
  | Ligne | Val |
`;
      const svg = renderCode(code);
      expect(svg).toContain('Mon Tableau');
    });

    test('affiche les en-têtes', () => {
      const code = `
table "Test"
  | header | Colonne1 | Colonne2 |
  | X | A | B |
`;
      const svg = renderCode(code);
      expect(svg).toContain('Colonne1');
      expect(svg).toContain('Colonne2');
    });

    test('affiche les données des cellules', () => {
      const code = `
table "Test"
  | header | A |
  | Label | Valeur |
`;
      const svg = renderCode(code);
      expect(svg).toContain('Label');
      expect(svg).toContain('Valeur');
    });
  });

  describe('Swimlanes', () => {
    test('génère un SVG valide pour un swimlane', () => {
      const code = `
swimlane "Test"
actors
  | Alice | Bob |

Alice: {Action}
`;
      const svg = renderCode(code);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    test('affiche le titre du swimlane', () => {
      const code = `
swimlane "Mon Swimlane"
actors
  | Alice |

Alice: {Action}
`;
      const svg = renderCode(code);
      expect(svg).toContain('Mon Swimlane');
    });

    test('affiche les en-têtes des colonnes acteurs', () => {
      const code = `
swimlane "Test"
actors
  | Thibaud | Cheffe projet | ARS |
`;
      const svg = renderCode(code);
      expect(svg).toContain('Thibaud');
      expect(svg).toContain('Cheffe projet');
      expect(svg).toContain('ARS');
    });

    test('rend les nœuds dans leur colonne', () => {
      const code = `
swimlane "Test"
actors
  | Alice | Bob |

Alice: {Action Alice}
Bob: {Action Bob}
`;
      const svg = renderCode(code);
      expect(svg).toContain('Action Alice');
      expect(svg).toContain('Action Bob');
    });

    test('rend les connexions entre acteurs', () => {
      const code = `
swimlane "Test"
actors
  | Alice | Bob |

Alice: {Action} -> Bob: {Réponse}
`;
      const svg = renderCode(code);
      expect(svg).toContain('<path');
      expect(svg).toContain('marker-end="url(#arrowhead)"');
    });

    test('rend les branches de décision', () => {
      const code = `
swimlane "Test"
actors
  | Alice |

Alice: <Choix?>
  | A -> [Option A]
  | B -> [Option B]
`;
      const svg = renderCode(code);
      expect(svg).toContain('Choix?');
      expect(svg).toContain('Option A');
      expect(svg).toContain('Option B');
    });
  });
});
