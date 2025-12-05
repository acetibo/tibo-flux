require('dotenv').config();
const express = require('express');
const path = require('path');

const indexRoutes = require('./routes/index');
const editorRoutes = require('./routes/editor');
const coursRoutes = require('./routes/cours');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/outputs', express.static(path.join(__dirname, '..', 'outputs')));

// Routes
app.use('/', indexRoutes);
app.use('/editor', editorRoutes);
app.use('/cours', coursRoutes);
app.use('/api', apiRoutes);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', {
    title: 'Erreur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TiboFlux démarré sur http://localhost:${PORT}`);
});

module.exports = app;
