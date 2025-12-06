/**
 * Service Database TiboFlux
 * Gestion SQLite avec better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tiboflux.db');

let db = null;

/**
 * Initialise la connexion et crée les tables si nécessaire
 */
function init() {
  if (db) return db;

  // Créer le dossier data s'il n'existe pas
  const fs = require('fs');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Créer la table documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'flowchart',
      is_template INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Insérer les templates par défaut s'ils n'existent pas
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_template = 1').get();
  if (templateCount.count === 0) {
    insertDefaultTemplates();
  }

  return db;
}

/**
 * Insère les templates par défaut
 */
function insertDefaultTemplates() {
  const templates = [
    {
      name: 'Flowchart - Vide',
      type: 'flowchart',
      code: `# Nouveau flowchart
flow "Mon processus"

[Début] -> {Action} -> [Fin]`
    },
    {
      name: 'Flowchart - Avec décision',
      type: 'flowchart',
      code: `# Flowchart avec branchement
flow "Processus avec décision"

[Début] -> {Vérifier condition}

{Vérifier condition} -> <Valide?>

<Valide?>
  | oui -> {Traitement OK} -> [Fin]
  | non -> {Traitement erreur} -> [Fin]`
    },
    {
      name: 'Flowchart - Complet',
      type: 'flowchart',
      code: `# Processus de commande e-commerce
flow "Commande"

[Réception commande] -> {Vérifier stock}

{Vérifier stock} -> <Disponible?>

<Disponible?>
  | oui -> {Traiter paiement} -> <Paiement OK?>
  | non -> {Notifier client} -> [Fin rupture]

<Paiement OK?>
  | oui -> {Préparer colis} -> {Expédier} -> [Fin livraison]
  | non -> {Annuler commande} -> [Fin annulation]`
    },
    {
      name: 'Tableau - Vide',
      type: 'table',
      code: `# Nouveau tableau
table "Mon tableau"
  | header | Colonne 1 | Colonne 2 | Colonne 3 |
  | Ligne 1 | Valeur | Valeur | Valeur |
  | Ligne 2 | Valeur | Valeur | Valeur |`
    },
    {
      name: 'Tableau - Comparatif',
      type: 'table',
      code: `# Tableau comparatif
table "Comparaison des options"
  | header | Option A | Option B | Option C |
  | Prix | 100€ | 150€ | 200€ |
  | Qualité | Moyenne | Bonne | Excellente |
  | Support | Email | Email + Tel | 24/7 |
  | Recommandé | Non | Oui | Premium |`
    },
    {
      name: 'Tableau - Avec fusion',
      type: 'table',
      code: `# Tableau avec colspan et rowspan
table "Rapport trimestriel"
  | header | - | T1 | T2 | T3 |
  | Ventes:r2 | 100 | 150 | 200 |
  | - | 120 | 180 | 220 |
  | Total:c3 | 970 |`
    }
  ];

  const insert = db.prepare(`
    INSERT INTO documents (name, code, type, is_template)
    VALUES (@name, @code, @type, 1)
  `);

  templates.forEach(t => insert.run(t));
}

/**
 * Récupère tous les documents (sans les templates)
 */
function getAllDocuments() {
  init();
  return db.prepare(`
    SELECT id, name, type, created_at, updated_at
    FROM documents
    WHERE is_template = 0
    ORDER BY updated_at DESC
  `).all();
}

/**
 * Récupère tous les templates
 */
function getTemplates() {
  init();
  return db.prepare(`
    SELECT id, name, code, type
    FROM documents
    WHERE is_template = 1
    ORDER BY type, name
  `).all();
}

/**
 * Récupère un document par ID
 */
function getDocument(id) {
  init();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
}

/**
 * Crée un nouveau document
 */
function createDocument(name, code, type = 'flowchart') {
  init();
  const result = db.prepare(`
    INSERT INTO documents (name, code, type)
    VALUES (?, ?, ?)
  `).run(name, code, type);
  return getDocument(result.lastInsertRowid);
}

/**
 * Met à jour un document
 */
function updateDocument(id, name, code) {
  init();
  db.prepare(`
    UPDATE documents
    SET name = ?, code = ?, updated_at = datetime('now')
    WHERE id = ? AND is_template = 0
  `).run(name, code, id);
  return getDocument(id);
}

/**
 * Supprime un document
 */
function deleteDocument(id) {
  init();
  const doc = getDocument(id);
  if (doc && doc.is_template) {
    throw new Error('Impossible de supprimer un template');
  }
  return db.prepare('DELETE FROM documents WHERE id = ? AND is_template = 0').run(id);
}

/**
 * Ferme la connexion
 */
function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  init,
  getAllDocuments,
  getTemplates,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  close
};
