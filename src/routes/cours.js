const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/cours', {
    title: 'TiboFlux - Cours : Standards de Diagrammes'
  });
});

module.exports = router;
