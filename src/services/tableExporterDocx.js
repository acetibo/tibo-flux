/**
 * Table Exporter DOCX - TiboFlux
 * Exporte les tableaux en format Word (.docx)
 */

const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType
} = require('docx');

/**
 * Normalise les cellules (string ou objet) en texte
 */
function getCellText(cell) {
  if (cell === null) return '';
  if (typeof cell === 'string') return cell;
  return cell.text || '';
}

/**
 * Récupère les propriétés d'une cellule (colspan, rowspan, align)
 */
function getCellProps(cell) {
  if (cell === null) return { colspan: 1, rowspan: 1, align: 'left' };
  if (typeof cell === 'string') return { colspan: 1, rowspan: 1, align: 'left' };
  return {
    colspan: cell.colspan || 1,
    rowspan: cell.rowspan || 1,
    align: cell.align || 'left'
  };
}

/**
 * Normalise les headers (simple array ou array de lignes)
 */
function normalizeHeaders(headers) {
  if (!headers || headers.length === 0) return [];
  if (Array.isArray(headers[0])) return headers;
  return [headers];
}

/**
 * Convertit l'alignement TiboFlux en alignement docx
 */
function getAlignment(align) {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    default: return AlignmentType.LEFT;
  }
}

/**
 * Crée une cellule Word
 */
function createCell(text, isHeader = false, props = {}) {
  const { colspan = 1, rowspan = 1, align = 'left' } = props;

  const cellOptions = {
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: isHeader,
            size: 22 // 11pt
          })
        ],
        alignment: getAlignment(align)
      })
    ],
    columnSpan: colspan > 1 ? colspan : undefined,
    rowSpan: rowspan > 1 ? rowspan : undefined
  };

  // Fond coloré pour les headers
  if (isHeader) {
    cellOptions.shading = {
      type: ShadingType.SOLID,
      color: 'E0E7FF', // Indigo clair
      fill: 'E0E7FF'
    };
  }

  return new TableCell(cellOptions);
}

/**
 * Crée une ligne de tableau Word
 */
function createRow(cells, isHeader = false) {
  const tableCells = [];

  cells.forEach(cell => {
    // Ignorer les cellules null (couvertes par colspan/rowspan)
    if (cell === null) return;

    const text = getCellText(cell);
    const props = getCellProps(cell);
    tableCells.push(createCell(text, isHeader, props));
  });

  return new TableRow({
    children: tableCells,
    tableHeader: isHeader
  });
}

/**
 * Exporte un AST de tableau en document Word
 * @param {Object} ast - AST du tableau (type: "Table")
 * @returns {Promise<Buffer>} - Buffer du fichier .docx
 */
async function exportToDocx(ast) {
  if (ast.type !== 'Table') {
    throw new Error('AST doit être de type Table');
  }

  const { name, headers, rows } = ast;
  const normalizedHeaders = normalizeHeaders(headers);

  // Créer les lignes du tableau
  const tableRows = [];

  // Ajouter les headers
  normalizedHeaders.forEach(headerRow => {
    tableRows.push(createRow(headerRow, true));
  });

  // Ajouter les données
  rows.forEach(row => {
    tableRows.push(createRow(row, false));
  });

  // Créer le tableau
  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });

  // Créer le document
  const doc = new Document({
    sections: [{
      children: [
        // Titre du tableau
        new Paragraph({
          text: name || 'Tableau',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        // Espace
        new Paragraph({ text: '' }),
        // Le tableau
        table
      ]
    }]
  });

  // Générer le buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

module.exports = { exportToDocx };
