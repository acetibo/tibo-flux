/**
 * Service principal TiboFlux
 * Orchestre lexer, parser, renderer et exporter
 */

const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { render } = require('./renderer');
const { exportDiagram } = require('./exporter');
const { exportTable } = require('./tableExporter');

/**
 * Parse le code TiboFlux et retourne l'AST
 */
function parseCode(code) {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  return ast;
}

/**
 * Génère le SVG à partir du code TiboFlux
 */
function renderCode(code) {
  const ast = parseCode(code);
  const svg = render(ast);
  return svg;
}

/**
 * Exporte le diagramme dans le format spécifié
 */
async function exportCode(code, format = 'png') {
  const svg = renderCode(code);
  const result = await exportDiagram(svg, format);
  return result;
}

module.exports = {
  parse: parseCode,
  render: renderCode,
  export: exportCode,
  // Expose les sous-modules pour debug
  tokenize,
  parseTokens: parse,
  renderAst: render,
  // Export tableaux (ASCII, Markdown, HTML)
  exportTable
};
