const express = require('express');
const router = express.Router();
const diagramService = require('../services/diagramService');
const { exportToDocx } = require('../services/tableExporterDocx');

// Parse le code TiboFlux et retourne l'AST (+ tokens si demandé)
router.post('/parse', (req, res) => {
  try {
    const { code, includeTokens } = req.body;
    const ast = diagramService.parse(code);
    const result = { success: true, ast };

    // Ajouter les tokens si demandé (pour debug)
    if (includeTokens) {
      const tokens = diagramService.tokenize(code);
      result.tokens = tokens.map(t => ({
        type: t.type,
        value: t.value,
        line: t.line,
        column: t.column
      }));
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Génère le SVG du diagramme
router.post('/render', (req, res) => {
  try {
    const { code } = req.body;
    const svg = diagramService.render(code);
    res.json({ success: true, svg });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Exporte le diagramme en PNG/PDF
router.post('/export', async (req, res) => {
  try {
    const { code, format = 'png' } = req.body;
    const result = await diagramService.export(code, format);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Exporte un tableau en ASCII, Markdown ou HTML
router.post('/export-table', (req, res) => {
  try {
    const { code, format = 'ascii' } = req.body;
    const ast = diagramService.parse(code);

    // Vérifier que c'est bien un tableau
    if (ast.type !== 'Table') {
      throw new Error('Le code ne contient pas de tableau. Utilisez la syntaxe: table "Titre"');
    }

    const content = diagramService.exportTable(ast, format);
    const mimeTypes = {
      ascii: 'text/plain',
      markdown: 'text/markdown',
      md: 'text/markdown',
      html: 'text/html'
    };

    res.json({
      success: true,
      content,
      format,
      mimeType: mimeTypes[format.toLowerCase()] || 'text/plain'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Exporte un swimlane en ASCII
router.post('/export-swimlane', (req, res) => {
  try {
    const { code, format = 'ascii' } = req.body;
    const ast = diagramService.parse(code);

    // Vérifier que c'est bien un swimlane
    if (ast.type !== 'Swimlane') {
      throw new Error('Le code ne contient pas de swimlane. Utilisez la syntaxe: swimlane "Titre"');
    }

    const content = diagramService.exportSwimlane(ast, format);

    res.json({
      success: true,
      content,
      format,
      mimeType: 'text/plain'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Exporte un tableau en Word (.docx)
router.post('/export-table-docx', async (req, res) => {
  try {
    const { code } = req.body;
    const ast = diagramService.parse(code);

    // Vérifier que c'est bien un tableau
    if (ast.type !== 'Table') {
      throw new Error('Le code ne contient pas de tableau. Utilisez la syntaxe: table "Titre"');
    }

    const buffer = await exportToDocx(ast);

    // Envoyer le fichier comme téléchargement
    const filename = `tableau-${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
