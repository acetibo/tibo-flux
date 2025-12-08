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
      context TEXT DEFAULT '',
      type TEXT DEFAULT 'flowchart',
      is_template INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration : ajouter la colonne context si elle n'existe pas
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN context TEXT DEFAULT ''`);
  } catch (e) {
    // La colonne existe déjà, ignorer
  }

  // Migration : ajouter le template swimlane s'il n'existe pas
  const swimlaneTemplate = db.prepare(`
    SELECT COUNT(*) as count FROM documents
    WHERE is_template = 1 AND type = 'swimlane'
  `).get();
  if (swimlaneTemplate.count === 0) {
    db.prepare(`
      INSERT INTO documents (name, code, type, is_template)
      VALUES (?, ?, ?, 1)
    `).run(
      'Swimlane - Processus multi-acteurs',
      `# Diagramme swimlane avec colonnes par acteur
swimlane "Preparation reunion ARS - Janvier 2025"

actors
  | Thibaud | Cheffe projet | ARS |

Thibaud: {Prepare documentation}
Thibaud: {Prepare documentation} -> Cheffe projet: {Valide contenu}
Cheffe projet: {Valide contenu} -> ARS: <Choix scenario?>
ARS: <Choix scenario?>
  | A -> [Passation complete]
  | B -> [Passation partielle]`,
      'swimlane'
    );
  }

  // Migration : ajouter ou mettre à jour le template Passation Sport Santé
  const passationTemplate = db.prepare(`
    SELECT COUNT(*) as count FROM documents
    WHERE is_template = 1 AND name LIKE '%Passation Sport%'
  `).get();
  const passationCode = `# Cas réel : Passation du Portail Sport Santé
swimlane "Passation Portail Sport Sante - Janvier 2025"

actors
  | CREAI ORS | ARS | Prestataire |

# Phase 1 : Preparation interne
CREAI ORS: {Prepare documentation technique}
CREAI ORS: {Prepare documentation technique} -> CREAI ORS: {Valide et vulgarise}

# Phase 2 : Presentation ARS
CREAI ORS: {Valide et vulgarise} -> ARS: {Reunion presentation scenarios}
ARS: {Reunion presentation scenarios} -> ARS: <Choix scenario?>

# Phase 3 : Selon le scenario choisi
ARS: <Choix scenario?>
  | A -> {Transfert complet}
  | B1 -> {Garde domaine seul}
  | B2 -> {Garde domaine + hebergement}

# Phase 4 : Scenario A - Passation complete
ARS: {Transfert complet} -> Prestataire: {Reprend tout}
Prestataire: {Reprend tout} -> Prestataire: [Fin scenario A]

# Phase 4 : Scenario B1/B2 - Garde partielle
ARS: {Garde domaine seul} -> CREAI ORS: {Gere domaine}
ARS: {Garde domaine + hebergement} -> CREAI ORS: {Gere domaine + hebergement}
CREAI ORS: {Gere domaine} -> Prestataire: {Reprend application}
CREAI ORS: {Gere domaine + hebergement} -> Prestataire: {Reprend application seule}
Prestataire: {Reprend application} -> Prestataire: [Fin scenario B1]
Prestataire: {Reprend application seule} -> Prestataire: [Fin scenario B2]`;
  if (passationTemplate.count === 0) {
    db.prepare(`
      INSERT INTO documents (name, code, type, is_template)
      VALUES (?, ?, ?, 1)
    `).run('Swimlane - Passation Sport Santé', passationCode, 'swimlane');
  } else {
    // Mettre à jour le template existant (migration vers 3 acteurs)
    db.prepare(`
      UPDATE documents SET code = ?
      WHERE is_template = 1 AND name LIKE '%Passation Sport%'
    `).run(passationCode);
  }

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
    },
    {
      name: 'Swimlane - Processus multi-acteurs',
      type: 'swimlane',
      code: `# Diagramme swimlane avec colonnes par acteur
swimlane "Preparation reunion ARS - Janvier 2025"

actors
  | Thibaud | Cheffe projet | ARS |

Thibaud: {Prepare documentation}
Thibaud: {Prepare documentation} -> Cheffe projet: {Valide contenu}
Cheffe projet: {Valide contenu} -> ARS: <Choix scenario?>
ARS: <Choix scenario?>
  | A -> [Passation complete]
  | B -> [Passation partielle]`
    },
    {
      name: 'Swimlane - Passation Sport Santé',
      type: 'swimlane',
      code: `# Cas réel : Passation du Portail Sport Santé
swimlane "Passation Portail Sport Sante - Janvier 2025"

actors
  | CREAI ORS | ARS | Prestataire |

# Phase 1 : Preparation interne
CREAI ORS: {Prepare documentation technique}
CREAI ORS: {Prepare documentation technique} -> CREAI ORS: {Valide et vulgarise}

# Phase 2 : Presentation ARS
CREAI ORS: {Valide et vulgarise} -> ARS: {Reunion presentation scenarios}
ARS: {Reunion presentation scenarios} -> ARS: <Choix scenario?>

# Phase 3 : Selon le scenario choisi
ARS: <Choix scenario?>
  | A -> {Transfert complet}
  | B1 -> {Garde domaine seul}
  | B2 -> {Garde domaine + hebergement}

# Phase 4 : Scenario A - Passation complete
ARS: {Transfert complet} -> Prestataire: {Reprend tout}
Prestataire: {Reprend tout} -> Prestataire: [Fin scenario A]

# Phase 4 : Scenario B1/B2 - Garde partielle
ARS: {Garde domaine seul} -> CREAI ORS: {Gere domaine}
ARS: {Garde domaine + hebergement} -> CREAI ORS: {Gere domaine + hebergement}
CREAI ORS: {Gere domaine} -> Prestataire: {Reprend application}
CREAI ORS: {Gere domaine + hebergement} -> Prestataire: {Reprend application seule}
Prestataire: {Reprend application} -> Prestataire: [Fin scenario B1]
Prestataire: {Reprend application seule} -> Prestataire: [Fin scenario B2]`
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
function createDocument(name, code, type = 'flowchart', context = '') {
  init();
  const result = db.prepare(`
    INSERT INTO documents (name, code, type, context)
    VALUES (?, ?, ?, ?)
  `).run(name, code, type, context);
  return getDocument(result.lastInsertRowid);
}

/**
 * Met à jour un document
 */
function updateDocument(id, name, code, context = '') {
  init();
  db.prepare(`
    UPDATE documents
    SET name = ?, code = ?, context = ?, updated_at = datetime('now')
    WHERE id = ? AND is_template = 0
  `).run(name, code, context, id);
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
