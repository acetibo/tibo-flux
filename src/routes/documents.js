/**
 * Routes API Documents TiboFlux
 * CRUD pour les documents et templates
 */

const express = require('express');
const router = express.Router();
const db = require('../services/database');

// GET /api/documents - Liste tous les documents
router.get('/', (req, res) => {
  try {
    const documents = db.getAllDocuments();
    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/documents/templates - Liste les templates
router.get('/templates', (req, res) => {
  try {
    const templates = db.getTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/documents/:id - Récupère un document
router.get('/:id', (req, res) => {
  try {
    const document = db.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/documents - Crée un nouveau document
router.post('/', (req, res) => {
  try {
    const { name, code, type, context } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Nom et code requis' });
    }
    const document = db.createDocument(name, code, type || 'flowchart', context || '');
    res.status(201).json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/documents/:id - Met à jour un document
router.put('/:id', (req, res) => {
  try {
    const { name, code, context } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Nom et code requis' });
    }
    const document = db.updateDocument(req.params.id, name, code, context || '');
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/documents/:id - Supprime un document
router.delete('/:id', (req, res) => {
  try {
    const result = db.deleteDocument(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Document non trouvé ou template' });
    }
    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
