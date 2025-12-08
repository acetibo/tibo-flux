/**
 * Tests Swimlane Exporter TiboFlux
 */

const { exportSwimlane, exportSwimlaneASCII } = require('../../src/services/swimlaneExporter');
const { tokenize } = require('../../src/services/lexer');
const { parse } = require('../../src/services/parser');

// Helper pour parser un swimlane
function parseSwimlane(code) {
  const tokens = tokenize(code);
  return parse(tokens);
}

describe('Swimlane Exporter TiboFlux', () => {
  describe('Export ASCII', () => {
    it('exporte un swimlane simple', () => {
      const ast = parseSwimlane(`
        swimlane "Test"
        actors
          | Alice | Bob |
        Alice: {Action}
      `);

      const result = exportSwimlaneASCII(ast);

      expect(result).toContain('Test');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('{Action}');
    });

    it('contient les bordures box-drawing', () => {
      const ast = parseSwimlane(`
        swimlane "Process"
        actors
          | A | B |
        A: {Start}
      `);

      const result = exportSwimlaneASCII(ast);

      // Bordures double pour le titre
      expect(result).toContain('╔');
      expect(result).toContain('╗');
      // Bordures transition titre -> contenu
      expect(result).toContain('╠');
      expect(result).toContain('╣');
      // Bordures pour le bas
      expect(result).toContain('└');
      expect(result).toContain('┘');
      // Separateurs
      expect(result).toContain('│');
    });

    it('affiche les noeuds avec leurs delimiteurs', () => {
      const ast = parseSwimlane(`
        swimlane "Types"
        actors
          | Actor |
        Actor: {Process node}
        Actor: <Decision node?>
        Actor: [Terminal node]
      `);

      const result = exportSwimlaneASCII(ast);

      expect(result).toContain('{Process node}');
      expect(result).toContain('<Decision node?>');
      expect(result).toContain('(Terminal node)'); // Terminal uses ()
    });

    it('affiche les connexions entre acteurs', () => {
      const ast = parseSwimlane(`
        swimlane "Connexion"
        actors
          | Source | Target |
        Source: {Action1}
        Source: {Action1} -> Target: {Action2}
      `);

      const result = exportSwimlaneASCII(ast);

      expect(result).toContain('{Action1}');
      expect(result).toContain('{Action2}');
      // Flèche horizontale
      expect(result).toContain('>');
    });

    it('affiche les branches de decision', () => {
      const ast = parseSwimlane(`
        swimlane "Branches"
        actors
          | Actor |
        Actor: <Choix?>
          | A -> [Option A]
          | B -> [Option B]
      `);

      const result = exportSwimlaneASCII(ast);

      expect(result).toContain('<Choix?>');
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('v'); // Flèche descendante
    });

    it('ajuste la largeur des colonnes dynamiquement', () => {
      const ast = parseSwimlane(`
        swimlane "Largeurs"
        actors
          | Court | Acteur avec un nom tres long |
        Court: {X}
      `);

      const result = exportSwimlaneASCII(ast);
      const lines = result.split('\n');

      // La colonne "Acteur avec un nom tres long" doit être plus large
      const headerLine = lines.find(l => l.includes('Acteur avec un nom tres long'));
      expect(headerLine).toBeTruthy();
    });
  });

  describe('Export principal', () => {
    it('exporte en ASCII par defaut', () => {
      const ast = parseSwimlane(`
        swimlane "Default"
        actors
          | A |
        A: {Test}
      `);

      const result = exportSwimlane(ast);
      expect(result).toContain('Default');
      expect(result).toContain('{Test}');
    });

    it('exporte en ASCII avec format explicite', () => {
      const ast = parseSwimlane(`
        swimlane "Explicit"
        actors
          | A |
        A: {Test}
      `);

      const result = exportSwimlane(ast, 'ascii');
      expect(result).toContain('Explicit');
    });

    it('lance une erreur pour format non supporte', () => {
      const ast = parseSwimlane(`
        swimlane "Error"
        actors
          | A |
        A: {Test}
      `);

      expect(() => exportSwimlane(ast, 'pdf')).toThrow('Format non supporté');
    });

    it('lance une erreur si AST n\'est pas un swimlane', () => {
      const ast = {
        type: 'Flowchart',
        name: 'Not a swimlane',
        nodes: [],
        connections: []
      };

      expect(() => exportSwimlane(ast)).toThrow('AST must be a Swimlane');
    });
  });
});
