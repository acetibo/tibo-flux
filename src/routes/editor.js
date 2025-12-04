const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/editor', {
    title: 'Éditeur TiboFlux'
  });
});

module.exports = router;
