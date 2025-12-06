/**
 * Tests du module tableExporter
 */

const { exportASCII, exportMarkdown, exportHTML, exportTable } = require('../../src/services/tableExporter');

describe('Table Exporter TiboFlux', () => {
  // AST de test simple
  const simpleTableAST = {
    type: 'Table',
    name: 'Test Simple',
    headers: ['Col1', 'Col2', 'Col3'],
    rows: [
      ['A', 'B', 'C'],
      ['D', 'E', 'F']
    ]
  };

  // AST avec multi-headers
  const multiHeaderAST = {
    type: 'Table',
    name: 'Multi Headers',
    headers: [
      ['Groupe A', 'Groupe B'],
      ['A1', 'A2', 'B1']
    ],
    rows: [
      ['1', '2', '3']
    ]
  };

  // AST avec colspan/rowspan
  const complexAST = {
    type: 'Table',
    name: 'Complexe',
    headers: [{ text: 'Catégorie', colspan: 2 }, 'Info'],
    rows: [
      [{ text: 'Label', rowspan: 2 }, 'X', 'Y'],
      [null, 'Z', 'W']
    ],
    isComplex: true
  };

  describe('Export ASCII', () => {
    test('exporte un tableau simple', () => {
      const result = exportASCII(simpleTableAST);

      expect(result).toContain('# Test Simple');
      expect(result).toContain('┌');
      expect(result).toContain('┐');
      expect(result).toContain('└');
      expect(result).toContain('┘');
      expect(result).toContain('│');
      expect(result).toContain('Col1');
      expect(result).toContain('Col2');
      expect(result).toContain('Col3');
    });

    test('affiche les données correctement', () => {
      const result = exportASCII(simpleTableAST);

      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(result).toContain('D');
      expect(result).toContain('E');
      expect(result).toContain('F');
    });

    test('gère les en-têtes multiples', () => {
      const result = exportASCII(multiHeaderAST);

      expect(result).toContain('Groupe A');
      expect(result).toContain('Groupe B');
      expect(result).toContain('A1');
      expect(result).toContain('A2');
    });
  });

  describe('Export Markdown', () => {
    test('exporte un tableau simple', () => {
      const result = exportMarkdown(simpleTableAST);

      expect(result).toContain('## Test Simple');
      expect(result).toContain('|');
      expect(result).toContain('Col1');
      expect(result).toContain('---');
    });

    test('génère le séparateur Markdown', () => {
      const result = exportMarkdown(simpleTableAST);
      const lines = result.split('\n');

      // Trouve la ligne séparateur
      const separatorLine = lines.find(l => l.includes('---'));
      expect(separatorLine).toBeDefined();
      expect(separatorLine).toMatch(/\|[\s-]+\|/);
    });

    test('affiche les données', () => {
      const result = exportMarkdown(simpleTableAST);

      expect(result).toContain('| A');
      expect(result).toContain('| D');
    });
  });

  describe('Export HTML', () => {
    test('exporte un document HTML valide', () => {
      const result = exportHTML(simpleTableAST);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html');
      expect(result).toContain('</html>');
      expect(result).toContain('<table>');
      expect(result).toContain('</table>');
    });

    test('inclut le titre dans caption', () => {
      const result = exportHTML(simpleTableAST);

      expect(result).toContain('<caption>Test Simple</caption>');
    });

    test('génère thead et tbody', () => {
      const result = exportHTML(simpleTableAST);

      expect(result).toContain('<thead>');
      expect(result).toContain('</thead>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('</tbody>');
    });

    test('utilise th pour les en-têtes', () => {
      const result = exportHTML(simpleTableAST);

      expect(result).toContain('<th>Col1</th>');
      expect(result).toContain('<th>Col2</th>');
    });

    test('utilise td pour les données', () => {
      const result = exportHTML(simpleTableAST);

      expect(result).toContain('<td>A</td>');
      expect(result).toContain('<td>D</td>');
    });

    test('gère colspan', () => {
      const result = exportHTML(complexAST);

      expect(result).toContain('colspan="2"');
    });

    test('gère rowspan', () => {
      const result = exportHTML(complexAST);

      expect(result).toContain('rowspan="2"');
    });

    test('échappe les caractères HTML', () => {
      const astWithSpecialChars = {
        type: 'Table',
        name: 'Test <script>',
        headers: ['A & B'],
        rows: [['<test>']]
      };
      const result = exportHTML(astWithSpecialChars);

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('A &amp; B');
      expect(result).toContain('&lt;test&gt;');
    });
  });

  describe('Export principal', () => {
    test('exporte en ASCII par défaut', () => {
      const result = exportTable(simpleTableAST);
      expect(result).toContain('┌');
    });

    test('exporte en markdown avec format "markdown"', () => {
      const result = exportTable(simpleTableAST, 'markdown');
      expect(result).toContain('|---');
    });

    test('exporte en markdown avec format "md"', () => {
      const result = exportTable(simpleTableAST, 'md');
      expect(result).toContain('|---');
    });

    test('exporte en HTML', () => {
      const result = exportTable(simpleTableAST, 'html');
      expect(result).toContain('<table>');
    });

    test('lance une erreur pour format inconnu', () => {
      expect(() => exportTable(simpleTableAST, 'pdf')).toThrow('Format non supporté');
    });
  });
});
