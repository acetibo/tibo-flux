/**
 * Table Exporter TiboFlux
 * Exporte les tableaux en ASCII art, Markdown et HTML
 */

/**
 * Normalise les cellules (string ou objet) en texte
 */
function getCellText(cell) {
  if (cell === null) return '';
  if (typeof cell === 'string') return cell;
  return cell.text || '';
}

/**
 * Normalise les headers (simple array ou array de lignes)
 */
function normalizeHeaders(headers) {
  if (!headers || headers.length === 0) return [];
  // Si c'est un array de lignes (multi-headers)
  if (Array.isArray(headers[0])) return headers;
  // Sinon c'est un array simple
  return [headers];
}

/**
 * Calcule la largeur de chaque colonne
 */
function calculateColumnWidths(headers, rows) {
  const normalizedHeaders = normalizeHeaders(headers);
  const numCols = Math.max(
    ...normalizedHeaders.map(h => h.length),
    ...rows.map(r => r.length)
  );

  const widths = new Array(numCols).fill(3); // minimum 3 chars

  // Parcourir les headers
  normalizedHeaders.forEach(headerRow => {
    headerRow.forEach((cell, i) => {
      const text = getCellText(cell);
      widths[i] = Math.max(widths[i], text.length);
    });
  });

  // Parcourir les rows
  rows.forEach(row => {
    row.forEach((cell, i) => {
      const text = getCellText(cell);
      if (i < widths.length) {
        widths[i] = Math.max(widths[i], text.length);
      }
    });
  });

  return widths;
}

/**
 * Export ASCII Art
 * ┌───────┬───────┬───────┐
 * │ Col1  │ Col2  │ Col3  │
 * ├───────┼───────┼───────┤
 * │ Data  │ Data  │ Data  │
 * └───────┴───────┴───────┘
 */
function exportASCII(ast) {
  const headers = normalizeHeaders(ast.headers);
  const rows = ast.rows || [];
  const widths = calculateColumnWidths(ast.headers, rows);

  const lines = [];

  // Caractères box-drawing
  const BOX = {
    topLeft: '┌', topRight: '┐', topMid: '┬', top: '─',
    midLeft: '├', midRight: '┤', midMid: '┼', mid: '─',
    botLeft: '└', botRight: '┘', botMid: '┴', bot: '─',
    left: '│', right: '│', sep: '│'
  };

  // Ligne horizontale
  const hLine = (left, mid, right, char) => {
    return left + widths.map(w => char.repeat(w + 2)).join(mid) + right;
  };

  // Ligne de données
  const dataLine = (cells) => {
    const paddedCells = widths.map((w, i) => {
      const text = i < cells.length ? getCellText(cells[i]) : '';
      return ' ' + text.padEnd(w) + ' ';
    });
    return BOX.left + paddedCells.join(BOX.sep) + BOX.right;
  };

  // Titre
  if (ast.name) {
    lines.push(`# ${ast.name}`);
    lines.push('');
  }

  // Bordure supérieure
  lines.push(hLine(BOX.topLeft, BOX.topMid, BOX.topRight, BOX.top));

  // Headers
  headers.forEach((headerRow, idx) => {
    lines.push(dataLine(headerRow));
    if (idx < headers.length - 1) {
      lines.push(hLine(BOX.midLeft, BOX.midMid, BOX.midRight, BOX.mid));
    }
  });

  // Séparateur headers/data
  if (headers.length > 0 && rows.length > 0) {
    lines.push(hLine(BOX.midLeft, BOX.midMid, BOX.midRight, BOX.mid));
  }

  // Rows
  rows.forEach((row, idx) => {
    lines.push(dataLine(row));
    if (idx < rows.length - 1) {
      lines.push(hLine(BOX.midLeft, BOX.midMid, BOX.midRight, BOX.mid));
    }
  });

  // Bordure inférieure
  lines.push(hLine(BOX.botLeft, BOX.botMid, BOX.botRight, BOX.bot));

  return lines.join('\n');
}

/**
 * Export Markdown
 * | Col1 | Col2 | Col3 |
 * |------|------|------|
 * | Data | Data | Data |
 */
function exportMarkdown(ast) {
  const headers = normalizeHeaders(ast.headers);
  const rows = ast.rows || [];
  const widths = calculateColumnWidths(ast.headers, rows);

  const lines = [];

  // Ligne de données Markdown
  const mdLine = (cells) => {
    const paddedCells = widths.map((w, i) => {
      const text = i < cells.length ? getCellText(cells[i]) : '';
      return ' ' + text.padEnd(w) + ' ';
    });
    return '|' + paddedCells.join('|') + '|';
  };

  // Séparateur Markdown
  const separator = () => {
    return '|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|';
  };

  // Titre
  if (ast.name) {
    lines.push(`## ${ast.name}`);
    lines.push('');
  }

  // Headers (en Markdown, on prend seulement la dernière ligne d'en-têtes)
  if (headers.length > 0) {
    // Si multi-headers, on les combine ou on prend le dernier
    const lastHeader = headers[headers.length - 1];
    lines.push(mdLine(lastHeader));
    lines.push(separator());
  }

  // Rows
  rows.forEach(row => {
    lines.push(mdLine(row));
  });

  return lines.join('\n');
}

/**
 * Export HTML
 */
function exportHTML(ast) {
  const headers = normalizeHeaders(ast.headers);
  const rows = ast.rows || [];

  const lines = [];

  // Escape HTML
  const escapeHTML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // Générer une cellule avec colspan/rowspan
  const cellHTML = (cell, tag = 'td') => {
    if (cell === null) return ''; // Cellule couverte

    const text = getCellText(cell);
    const attrs = [];

    if (typeof cell === 'object') {
      if (cell.colspan && cell.colspan > 1) attrs.push(`colspan="${cell.colspan}"`);
      if (cell.rowspan && cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`);
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return `      <${tag}${attrStr}>${escapeHTML(text)}</${tag}>`;
  };

  // Document HTML complet
  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="fr">');
  lines.push('<head>');
  lines.push('  <meta charset="UTF-8">');
  lines.push(`  <title>${ast.name ? escapeHTML(ast.name) : 'Tableau TiboFlux'}</title>`);
  lines.push('  <style>');
  lines.push('    table { border-collapse: collapse; width: 100%; font-family: sans-serif; }');
  lines.push('    th, td { border: 1px solid #6b7280; padding: 12px; text-align: left; }');
  lines.push('    th { background-color: #e0e7ff; color: #1e1b4b; font-weight: bold; }');
  lines.push('    tr:nth-child(even) { background-color: #f9fafb; }');
  lines.push('    caption { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }');
  lines.push('  </style>');
  lines.push('</head>');
  lines.push('<body>');
  lines.push('  <table>');

  // Titre
  if (ast.name) {
    lines.push(`    <caption>${escapeHTML(ast.name)}</caption>`);
  }

  // Headers
  if (headers.length > 0) {
    lines.push('    <thead>');
    headers.forEach(headerRow => {
      lines.push('    <tr>');
      headerRow.forEach(cell => {
        const html = cellHTML(cell, 'th');
        if (html) lines.push(html);
      });
      lines.push('    </tr>');
    });
    lines.push('    </thead>');
  }

  // Body
  if (rows.length > 0) {
    lines.push('    <tbody>');
    rows.forEach(row => {
      lines.push('    <tr>');
      row.forEach(cell => {
        const html = cellHTML(cell, 'td');
        if (html) lines.push(html);
      });
      lines.push('    </tr>');
    });
    lines.push('    </tbody>');
  }

  lines.push('  </table>');
  lines.push('</body>');
  lines.push('</html>');

  return lines.join('\n');
}

/**
 * Export principal
 */
function exportTable(ast, format = 'ascii') {
  switch (format.toLowerCase()) {
    case 'ascii':
      return exportASCII(ast);
    case 'markdown':
    case 'md':
      return exportMarkdown(ast);
    case 'html':
      return exportHTML(ast);
    default:
      throw new Error(`Format non supporté: ${format}. Utilisez ascii, markdown ou html.`);
  }
}

module.exports = {
  exportTable,
  exportASCII,
  exportMarkdown,
  exportHTML
};
