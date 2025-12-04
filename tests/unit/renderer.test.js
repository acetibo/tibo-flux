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
});
