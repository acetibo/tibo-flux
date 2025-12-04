const express = require('express');
const router = express.Router();
const diagramService = require('../services/diagramService');

// Parse le code TiboFlux et retourne l'AST
router.post('/parse', (req, res) => {
  try {
    const { code } = req.body;
    const ast = diagramService.parse(code);
    res.json({ success: true, ast });
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

module.exports = router;
