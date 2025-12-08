/**
 * Swimlane Exporter TiboFlux
 * Exporte les swimlanes en ASCII art
 */

/**
 * Caractères box-drawing
 */
const BOX = {
  // Bordures
  topLeft: '┌', topRight: '┐', topMid: '┬', top: '─',
  midLeft: '├', midRight: '┤', midMid: '┼', mid: '─',
  botLeft: '└', botRight: '┘', botMid: '┴', bot: '─',
  left: '│', right: '│', sep: '│',
  // Double pour titre
  dblTop: '═', dblLeft: '║', dblRight: '║',
  dblTopLeft: '╔', dblTopRight: '╗',
  dblMidLeft: '╠', dblMidRight: '╣',
  // Flèches
  arrowRight: '>',
  arrowDown: 'v',
  lineH: '─',
  lineV: '│'
};

/**
 * Formes ASCII pour les noeuds
 */
const NODE_CHARS = {
  Terminal: { left: '(', right: ')' },
  Process: { left: '{', right: '}' },
  Decision: { left: '<', right: '>' },
  IO: { left: '[', right: ']' }
};

/**
 * Dessine un noeud en ASCII
 */
function drawNode(node, maxWidth) {
  const chars = NODE_CHARS[node.type] || NODE_CHARS.Process;
  const text = node.text || '';
  const innerWidth = maxWidth - 2;

  let displayText = text;
  if (text.length > innerWidth) {
    displayText = text.substring(0, innerWidth - 2) + '..';
  }

  return chars.left + displayText + chars.right;
}

/**
 * Crée un mapping id -> node
 */
function createNodeMap(nodes) {
  const map = {};
  nodes.forEach(node => {
    map[node.id] = node;
  });
  return map;
}

/**
 * Calcule la largeur de chaque colonne d'acteur
 */
function calculateColumnWidths(ast, minWidth = 18) {
  const widths = {};

  // Initialiser avec la largeur du nom d'acteur + padding
  ast.actors.forEach(actor => {
    widths[actor] = Math.max(minWidth, actor.length + 4);
  });

  // Parcourir les noeuds pour trouver la largeur max par acteur
  ast.nodes.forEach(node => {
    const actor = node.actor;
    const textLen = (node.text || '').length + 4;
    if (widths[actor] !== undefined) {
      widths[actor] = Math.max(widths[actor], textLen);
    }
  });

  // Vérifier les branches - si un acteur a des branches, calculer la largeur totale nécessaire
  ast.nodes.forEach(node => {
    if (node.type === 'Decision') {
      const branches = ast.connections.filter(c => c.from === node.id && c.label);
      if (branches.length > 1) {
        const nodeMap = createNodeMap(ast.nodes);
        const branchNodes = branches.map(b => nodeMap[b.to]).filter(n => n);
        // Calculer la largeur nécessaire pour afficher les branches côte-à-côte
        const totalBranchWidth = branchNodes.reduce((sum, n) => {
          return sum + (n.text || '').length + 4;
        }, 0) + (branchNodes.length - 1) * 2; // +2 pour l'espace entre

        if (widths[node.actor] !== undefined) {
          widths[node.actor] = Math.max(widths[node.actor], totalBranchWidth);
        }
      }
    }
  });

  return widths;
}

/**
 * Organise les noeuds par niveau (ordre de traitement)
 */
function organizeNodesByLevel(ast) {
  const nodeMap = createNodeMap(ast.nodes);
  const levels = [];
  const processed = new Set();

  // Trouver les noeuds racines (pas de connexion entrante)
  const hasIncoming = new Set();
  ast.connections.forEach(conn => {
    hasIncoming.add(conn.to);
  });

  const roots = ast.nodes.filter(n => !hasIncoming.has(n.id));

  // BFS pour organiser par niveaux
  let currentLevel = roots.length > 0 ? roots : [ast.nodes[0]];
  let levelIdx = 0;

  while (currentLevel.length > 0 && levelIdx < 20) {
    levels[levelIdx] = currentLevel.filter(n => n && !processed.has(n.id));
    levels[levelIdx].forEach(n => processed.add(n.id));

    // Trouver les noeuds du niveau suivant
    const nextLevel = [];
    levels[levelIdx].forEach(node => {
      const outgoing = ast.connections.filter(c => c.from === node.id);
      outgoing.forEach(conn => {
        const targetNode = nodeMap[conn.to];
        if (targetNode && !processed.has(targetNode.id)) {
          nextLevel.push(targetNode);
        }
      });
    });

    currentLevel = nextLevel;
    levelIdx++;
  }

  return levels;
}

/**
 * Export ASCII Art pour swimlanes
 */
function exportSwimlaneASCII(ast) {
  const widths = calculateColumnWidths(ast);
  const actors = ast.actors;
  const totalWidth = actors.reduce((sum, a) => sum + widths[a], 0) + actors.length + 1;
  const nodeMap = createNodeMap(ast.nodes);

  const lines = [];

  // === Titre ===
  if (ast.name) {
    const titlePadded = ast.name.padStart(Math.floor((totalWidth - 2 + ast.name.length) / 2)).padEnd(totalWidth - 2);
    lines.push(BOX.dblTopLeft + BOX.dblTop.repeat(totalWidth - 2) + BOX.dblTopRight);
    lines.push(BOX.dblLeft + titlePadded + BOX.dblRight);
  }

  // === En-têtes acteurs ===
  let headerTop = ast.name ? BOX.dblMidLeft : BOX.topLeft;
  actors.forEach((actor, i) => {
    headerTop += BOX.top.repeat(widths[actor]);
    headerTop += i < actors.length - 1 ? BOX.topMid : (ast.name ? BOX.dblMidRight : BOX.topRight);
  });
  lines.push(headerTop);

  // Noms des acteurs
  let headerNames = BOX.left;
  actors.forEach((actor, i) => {
    const padded = actor.padStart(Math.floor((widths[actor] + actor.length) / 2)).padEnd(widths[actor]);
    headerNames += padded;
    headerNames += i < actors.length - 1 ? BOX.sep : BOX.right;
  });
  lines.push(headerNames);

  // Séparateur
  let headerSep = BOX.midLeft;
  actors.forEach((actor, i) => {
    headerSep += BOX.mid.repeat(widths[actor]);
    headerSep += i < actors.length - 1 ? BOX.midMid : BOX.midRight;
  });
  lines.push(headerSep);

  // === Contenu : noeuds organisés par niveau ===
  const levels = organizeNodesByLevel(ast);

  levels.forEach((levelNodes, levelIdx) => {
    if (!levelNodes || levelNodes.length === 0) return;

    // Regrouper les noeuds par acteur pour ce niveau
    const nodesByActor = {};
    actors.forEach(a => nodesByActor[a] = []);
    levelNodes.forEach(node => {
      if (nodesByActor[node.actor]) {
        nodesByActor[node.actor].push(node);
      }
    });

    // Ligne avec les noeuds
    let nodeLine = BOX.left;
    actors.forEach((actor, i) => {
      let content = '';
      const actorNodes = nodesByActor[actor];
      if (actorNodes.length > 0) {
        // Afficher le(s) noeud(s) de cet acteur
        const nodeTexts = actorNodes.map(n => drawNode(n, widths[actor] - 2)).join(' ');
        content = (' ' + nodeTexts).padEnd(widths[actor]);
      } else {
        content = ' '.repeat(widths[actor]);
      }
      nodeLine += content;
      nodeLine += i < actors.length - 1 ? BOX.sep : BOX.right;
    });
    lines.push(nodeLine);

    // Vérifier s'il y a des connexions sortantes vers d'autres acteurs
    levelNodes.forEach(node => {
      const outgoing = ast.connections.filter(c => c.from === node.id);
      outgoing.forEach(conn => {
        const targetNode = nodeMap[conn.to];
        if (targetNode && targetNode.actor !== node.actor) {
          // Dessiner une flèche horizontale
          const fromIdx = actors.indexOf(node.actor);
          const toIdx = actors.indexOf(targetNode.actor);

          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            let arrowLine = BOX.left;
            actors.forEach((actor, i) => {
              let content = '';
              if (i === fromIdx) {
                content = ' '.repeat(widths[actor] - 4) + BOX.lineH.repeat(3) + '+';
              } else if (i > fromIdx && i < toIdx) {
                content = BOX.lineH.repeat(widths[actor] - 1) + '+';
              } else if (i === toIdx) {
                content = BOX.lineH + BOX.arrowRight + ' '.repeat(widths[actor] - 2);
              } else {
                content = ' '.repeat(widths[actor]);
              }
              arrowLine += content;
              arrowLine += i < actors.length - 1 ? BOX.sep : BOX.right;
            });
            lines.push(arrowLine);
          }
        }
      });
    });

    // Vérifier s'il y a des branches (décisions)
    levelNodes.forEach(node => {
      if (node.type === 'Decision') {
        const branches = ast.connections.filter(c => c.from === node.id && c.label);
        if (branches.length > 1) {
          // Ligne avec labels de branches
          let branchLine = BOX.left;
          actors.forEach((actor, i) => {
            let content = '';
            if (actor === node.actor) {
              const labels = branches.map(b => b.label).join('     ');
              content = ('   ' + labels).padEnd(widths[actor]);
            } else {
              content = ' '.repeat(widths[actor]);
            }
            branchLine += content;
            branchLine += i < actors.length - 1 ? BOX.sep : BOX.right;
          });
          lines.push(branchLine);

          // Ligne avec flèches descendantes
          let arrowLine = BOX.left;
          actors.forEach((actor, i) => {
            let content = '';
            if (actor === node.actor) {
              const arrows = branches.map(() => BOX.arrowDown).join('     ');
              content = ('   ' + arrows).padEnd(widths[actor]);
            } else {
              content = ' '.repeat(widths[actor]);
            }
            arrowLine += content;
            arrowLine += i < actors.length - 1 ? BOX.sep : BOX.right;
          });
          lines.push(arrowLine);
        }
      }
    });
  });

  // Ligne vide si contenu court
  if (levels.length < 2) {
    let emptyLine = BOX.left;
    actors.forEach((actor, i) => {
      emptyLine += ' '.repeat(widths[actor]);
      emptyLine += i < actors.length - 1 ? BOX.sep : BOX.right;
    });
    lines.push(emptyLine);
  }

  // === Bordure inférieure ===
  let bottomLine = BOX.botLeft;
  actors.forEach((actor, i) => {
    bottomLine += BOX.bot.repeat(widths[actor]);
    bottomLine += i < actors.length - 1 ? BOX.botMid : BOX.botRight;
  });
  lines.push(bottomLine);

  return lines.join('\n');
}

/**
 * Export principal
 */
function exportSwimlane(ast, format = 'ascii') {
  if (ast.type !== 'Swimlane') {
    throw new Error('AST must be a Swimlane');
  }

  switch (format.toLowerCase()) {
    case 'ascii':
      return exportSwimlaneASCII(ast);
    default:
      throw new Error(`Format non supporté: ${format}. Utilisez ascii.`);
  }
}

module.exports = {
  exportSwimlane,
  exportSwimlaneASCII
};
